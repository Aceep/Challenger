import "server-only";
import { prisma } from "@/lib/db";

export type LeaderboardRow = {
  teamId: string;
  name: string;
  color: string;
  points: number;
  members: number;
  books: number;
  rank: number;
};

/** Team ranking for a challenge: sum of the ledger inside the window. */
export async function getLeaderboard(challengeId: string): Promise<LeaderboardRow[]> {
  const challenge = await prisma.challenge.findUniqueOrThrow({ where: { id: challengeId } });
  const teams = await prisma.team.findMany({
    where: { challengeId },
    include: {
      _count: { select: { members: true } },
      members: { select: { user: { select: { _count: { select: { books: true } } } } } },
    },
  });
  const sums = await prisma.pointEvent.groupBy({
    by: ["teamId"],
    where: {
      teamId: { in: teams.map((t) => t.id) },
      createdAt: { gte: challenge.startAt, lte: challenge.endAt },
    },
    _sum: { amount: true },
  });
  const byTeam = new Map(sums.map((s) => [s.teamId, s._sum.amount ?? 0]));

  const rows: LeaderboardRow[] = teams
    .map((t) => ({
      teamId: t.id,
      name: t.name,
      color: t.color,
      points: byTeam.get(t.id) ?? 0,
      members: t._count.members,
      books: t.members.reduce((n, m) => n + m.user._count.books, 0),
      rank: 0,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  // Competition ranking: equal points share a rank (1, 1, 3).
  rows.forEach((row, i) => {
    row.rank = i > 0 && rows[i - 1].points === row.points ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

export async function getTeamScore(teamId: string): Promise<number> {
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { challenge: true },
  });
  const r = await prisma.pointEvent.aggregate({
    where: {
      teamId,
      createdAt: { gte: team.challenge.startAt, lte: team.challenge.endAt },
    },
    _sum: { amount: true },
  });
  return r._sum.amount ?? 0;
}

/** Runs `fn`, then reports the leader before/after so callers can announce a change. */
export async function withLeaderWatch<T>(challengeId: string | null | undefined, fn: () => Promise<T>) {
  const top = async () => (challengeId ? (await getLeaderboard(challengeId)).map((r) => ({ teamId: r.teamId, name: r.name })) : []);
  const before = await top();
  const result = await fn();
  const after = await top();
  return { result, before, after };
}
