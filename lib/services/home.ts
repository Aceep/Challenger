import "server-only";
import { prisma } from "@/lib/db";
import { weekActions, type WeekAction } from "@/lib/home/week";
import { bookWeight, isComplete, round1 } from "@/lib/scoring/reading";
import { cellLabel } from "@/lib/services/bingo";
import { getLeaderboard } from "@/lib/services/leaderboard";
import { num } from "@/lib/services/points";
import { gameWeek } from "@/lib/time/paris";

/**
 * Everything the player home needs, in seven flat queries and no writes
 * (the story page and the tick are the ones that open / resolve votes).
 *
 * Every count belongs to `challengeId`: « Mes points » and the share of the team
 * total would be inflated by the readings of the person's other editions.
 *
 * « Cette semaine » really means the playing week (`gameWeek`, Sunday 21 h →
 * Sunday 19 h Paris): the actions listed are the ones the person did since the
 * last verification window closed, and nothing older.
 */
export async function getHomeSummary(
  userId: string,
  challengeId: string | null,
  team: { id: string; challengeId: string; startAt: Date; endAt: Date } | null,
  now = new Date(),
) {
  const week = gameWeek(now);
  const ofEdition = challengeId ? { OR: [{ team: { challengeId } }, { teamId: null }] } : { teamId: null };
  const [books, rows, score, vote, teamGrid, fills, completions] = await Promise.all([
    prisma.book.findMany({ where: { userId, deletedAt: null, ...ofEdition }, select: { title: true, type: true, points: true, createdAt: true } }),
    team ? getLeaderboard(team.challengeId) : Promise.resolve([]),
    team
      ? prisma.pointEvent.aggregate({ where: { teamId: team.id, createdAt: { gte: team.startAt, lte: team.endAt } }, _sum: { amount: true } }).then((r) => round1(num(r._sum.amount)))
      : Promise.resolve(0),
    team
      ? prisma.vote.findFirst({
          where: { teamId: team.id, status: "OPEN" },
          // Only my own ballot: whether *I* still owe a vote, not who else voted.
          select: { deadline: true, tieStage: true, node: { select: { title: true } }, ballots: { where: { userId }, select: { userId: true } } },
        })
      : Promise.resolve(null),
    team
      ? prisma.teamGrid.findFirst({
          where: { teamId: team.id, completedAt: null },
          select: {
            grid: {
              select: {
                cells: {
                  orderBy: [{ row: "asc" }, { col: "asc" }],
                  select: { row: true, col: true, fills: { where: { teamId: team.id, book: { deletedAt: null } }, select: { book: { select: { type: true } } } } },
                },
              },
            },
          },
        })
      : Promise.resolve(null),
    // Cells filled with one of my readings this week (the team scopes the edition).
    team
      ? prisma.bingoFill.findMany({
          where: { teamId: team.id, createdAt: { gte: week.start }, book: { userId, deletedAt: null } },
          select: { createdAt: true, cell: { select: { row: true, col: true } }, book: { select: { title: true } } },
        })
      : Promise.resolve([]),
    // Quests my reading finished off for the team this week.
    team
      ? prisma.questCompletion.findMany({
          where: { teamId: team.id, completedById: userId, createdAt: { gte: week.start } },
          select: { createdAt: true, quest: { select: { number: true, title: true } } },
        })
      : Promise.resolve([]),
  ]);

  const myPoints = round1(books.reduce((n, b) => n + num(b.points), 0));
  const graphiques = books.filter((b) => b.type === "GRAPHIQUE").length;
  const pendingCells = (teamGrid?.grid.cells ?? [])
    .map((c) => ({ label: cellLabel(c.row, c.col), weights: c.fills.map((f) => bookWeight(f.book.type)) }))
    .filter((c) => c.weights.length > 0 && !isComplete(c.weights))
    .slice(0, 2)
    .map((c) => ({ label: c.label, missing: "il manque ½ graphique (ou un roman)" }));

  const actions: WeekAction[] = [
    ...books.filter((b) => b.createdAt >= week.start).map((b) => ({ kind: "book" as const, at: b.createdAt, title: b.title, points: num(b.points) })),
    ...fills.map((f) => ({ kind: "cell" as const, at: f.createdAt, label: cellLabel(f.cell.row, f.cell.col), title: f.book.title })),
    ...completions.map((c) => ({ kind: "quest" as const, at: c.createdAt, number: c.quest.number, title: c.quest.title })),
  ];

  return {
    score,
    rows,
    stats: { romans: books.length - graphiques, graphiques, myPoints, teamShare: score > 0 ? Math.round((myPoints / score) * 100) : null },
    week: {
      actions: weekActions(actions),
      // A vote already cast is still worth showing — it says the chapter is under way.
      vote: vote ? { chapter: vote.node.title, deadline: vote.deadline, voted: vote.ballots.length > 0, tie: vote.tieStage !== "NONE" } : null,
      pendingCells,
    },
  };
}
