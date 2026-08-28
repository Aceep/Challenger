import "server-only";
import { prisma } from "@/lib/db";
import { bookWeight, isComplete, round1 } from "@/lib/scoring/reading";
import { cellLabel } from "@/lib/services/bingo";
import { getLeaderboard } from "@/lib/services/leaderboard";
import { num } from "@/lib/services/points";

/**
 * Everything the player home needs, in five flat queries and no writes
 * (the story page and the tick are the ones that open / resolve votes).
 */
export async function getHomeSummary(userId: string, team: { id: string; challengeId: string; startAt: Date; endAt: Date } | null) {
  const [books, rows, score, vote, teamGrid] = await Promise.all([
    prisma.book.findMany({ where: { userId, deletedAt: null }, select: { type: true, points: true } }),
    team ? getLeaderboard(team.challengeId) : Promise.resolve([]),
    team
      ? prisma.pointEvent.aggregate({ where: { teamId: team.id, createdAt: { gte: team.startAt, lte: team.endAt } }, _sum: { amount: true } }).then((r) => round1(num(r._sum.amount)))
      : Promise.resolve(0),
    team ? prisma.vote.findFirst({ where: { teamId: team.id, status: "OPEN" }, select: { deadline: true, node: { select: { title: true } } } }) : Promise.resolve(null),
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
  ]);

  const myPoints = round1(books.reduce((n, b) => n + num(b.points), 0));
  const graphiques = books.filter((b) => b.type === "GRAPHIQUE").length;
  const pendingCells = (teamGrid?.grid.cells ?? [])
    .map((c) => ({ label: cellLabel(c.row, c.col), weights: c.fills.map((f) => bookWeight(f.book.type)) }))
    .filter((c) => c.weights.length > 0 && !isComplete(c.weights))
    .slice(0, 2)
    .map((c) => ({ label: c.label, missing: "il manque ½ graphique (ou un roman)" }));

  return {
    score,
    rows,
    stats: { romans: books.length - graphiques, graphiques, myPoints, teamShare: score > 0 ? Math.round((myPoints / score) * 100) : null },
    vote: vote ? { chapter: vote.node.title, deadline: vote.deadline } : null,
    pendingCells,
  };
}
