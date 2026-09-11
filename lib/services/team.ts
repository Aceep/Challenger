import { GameError } from "@/lib/errors";
import "server-only";
import { prisma } from "@/lib/db";
import { round1 } from "@/lib/scoring/reading";
import { roleIn } from "@/lib/services/membership";
import { num } from "@/lib/services/points";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type Db = typeof prisma | Tx;

/**
 * Everyone who follows a team's story: its own members, plus the members of
 * every team it is allied with.
 *
 * This is one list on purpose. An alliance lets the allied players vote on the
 * chapter (`eligibleVoterIds` in `lib/services/story.ts`), so they are exactly
 * the people a notification about that chapter concerns — « qui peut voter » and
 * « qui est prévenu » can never drift apart if they read the same query.
 *
 * Takes the transaction client when there is one: `castBallot` checks the voter
 * list inside its own transaction and must see the alliances it sees.
 */
export async function teamAudienceIds(teamId: string, db: Db = prisma): Promise<string[]> {
  const allies = await db.alliance.findMany({ where: { OR: [{ teamAId: teamId }, { teamBId: teamId }] } });
  const teamIds = [teamId, ...allies.map((a) => (a.teamAId === teamId ? a.teamBId : a.teamAId))];
  const members = await db.teamMember.findMany({ where: { teamId: { in: teamIds } }, select: { userId: true } });
  // `TeamMember` is keyed (userId, challengeId) and allies play the same
  // edition, so this only ever guards against a future alliance shape.
  return [...new Set(members.map((m) => m.userId))];
}

export async function getTeamStats(teamId: string) {
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: {
      challenge: true,
      captain: { select: { id: true, name: true } },
      deputy: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
      books: { where: { deletedAt: null }, select: { userId: true, pages: true, type: true } },
      modifiers: { where: { endAt: { gt: new Date() } }, orderBy: { endAt: "asc" } },
    },
  });
  const window = { gte: team.challenge.startAt, lte: team.challenge.endAt };
  const [perUser, recent, bySource] = await Promise.all([
    prisma.pointEvent.groupBy({ by: ["userId"], where: { teamId, createdAt: window }, _sum: { amount: true } }),
    prisma.pointEvent.findMany({ where: { teamId, createdAt: window }, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, amount: true, label: true, source: true, createdAt: true, userId: true } }),
    prisma.pointEvent.groupBy({ by: ["source"], where: { teamId, createdAt: window }, _sum: { amount: true } }),
  ]);
  const pointsByUser = new Map(perUser.map((p) => [p.userId, round1(num(p._sum.amount))]));
  const names = new Map(team.members.map((m) => [m.user.id, m.user.name ?? "?"]));

  return {
    team,
    members: team.members
      .map((m) => {
        const books = team.books.filter((b) => b.userId === m.user.id);
        return {
          id: m.user.id,
          name: m.user.name ?? "?",
          image: m.user.image,
          books: books.filter((b) => b.type === "ROMAN").length,
          graphics: books.filter((b) => b.type === "GRAPHIQUE").length,
          pages: books.reduce((n, b) => n + b.pages, 0),
          points: pointsByUser.get(m.user.id) ?? 0,
          isCaptain: team.captainId === m.user.id,
          isDeputy: team.deputyId === m.user.id,
        };
      })
      .sort((a, b) => b.points - a.points),
    total: round1(bySource.reduce((n, s) => n + num(s._sum.amount), 0)),
    bySource: Object.fromEntries(bySource.map((s) => [s.source, round1(num(s._sum.amount))])) as Record<string, number>,
    recent: recent.map((e) => ({ ...e, amount: num(e.amount), who: e.userId ? (names.get(e.userId) ?? null) : null })),
    modifiers: team.modifiers,
  };
}

/**
 * The captain (or an admin) names the team's adjoint among its members. The role
 * is re-derived inside the team's **own** edition: organising the edition being
 * browsed says nothing about the one the team plays in.
 */
export async function setDeputy(teamId: string, userId: string | null, actorId: string) {
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, include: { members: { select: { userId: true } } } });
  const role = await roleIn(actorId, team.challengeId);
  if (role !== "ORGANIZER" && team.captainId !== actorId) throw new GameError("Seul·e le·la capitaine peut nommer l'adjoint·e");
  if (userId && !team.members.some((m) => m.userId === userId)) throw new GameError("Ce joueur n'est pas dans l'équipe");
  if (userId && userId === team.captainId) throw new GameError("Le·la capitaine ne peut pas être son·sa propre adjoint·e");
  return prisma.team.update({ where: { id: teamId }, data: { deputyId: userId } });
}
