import "server-only";
import { prisma } from "@/lib/db";

export async function getTeamStats(teamId: string) {
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: {
      challenge: true,
      captain: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true, image: true, books: { select: { pages: true } } } } } },
      modifiers: { where: { endAt: { gt: new Date() } }, orderBy: { endAt: "asc" } },
    },
  });
  const window = { gte: team.challenge.startAt, lte: team.challenge.endAt };
  const [perUser, recent, bySource] = await Promise.all([
    prisma.pointEvent.groupBy({ by: ["userId"], where: { teamId, createdAt: window }, _sum: { amount: true } }),
    prisma.pointEvent.findMany({ where: { teamId, createdAt: window }, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, amount: true, label: true, source: true, createdAt: true, userId: true } }),
    prisma.pointEvent.groupBy({ by: ["source"], where: { teamId, createdAt: window }, _sum: { amount: true } }),
  ]);
  const pointsByUser = new Map(perUser.map((p) => [p.userId, p._sum.amount ?? 0]));
  const names = new Map(team.members.map((m) => [m.user.id, m.user.name ?? "?"]));

  return {
    team,
    members: team.members
      .map((m) => ({
        id: m.user.id,
        name: m.user.name ?? "?",
        image: m.user.image,
        books: m.user.books.length,
        pages: m.user.books.reduce((n, b) => n + b.pages, 0),
        points: pointsByUser.get(m.user.id) ?? 0,
        isCaptain: team.captainId === m.user.id,
      }))
      .sort((a, b) => b.points - a.points),
    total: bySource.reduce((n, s) => n + (s._sum.amount ?? 0), 0),
    bySource: Object.fromEntries(bySource.map((s) => [s.source, s._sum.amount ?? 0])) as Record<string, number>,
    recent: recent.map((e) => ({ ...e, who: e.userId ? (names.get(e.userId) ?? null) : null })),
    modifiers: team.modifiers,
  };
}
