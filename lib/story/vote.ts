/**
 * Pure vote resolution and chapter gating. No I/O.
 */

export type Ballot = { userId: string; choiceId: string; createdAt: Date };

export type ResolveInput = {
  ballots: Ballot[];
  /** Choice ids in display order — used as the last tie-breaker. */
  choiceIds: string[];
  captainId: string | null;
  /** Members entitled to vote (own team + allies). */
  eligibleCount: number;
  deadline: Date;
  now: Date;
};

export type ResolveResult =
  | { status: "pending"; reason: "waiting"; tally: Record<string, number> }
  | { status: "resolved"; choiceId: string; tally: Record<string, number>; tieBreak: "none" | "captain" | "order" };

export function tally(ballots: Ballot[], choiceIds: string[]): Record<string, number> {
  const t: Record<string, number> = Object.fromEntries(choiceIds.map((id) => [id, 0]));
  for (const b of ballots) if (b.choiceId in t) t[b.choiceId]++;
  return t;
}

/**
 * Resolves when everyone eligible has voted or the deadline passed.
 * Majority wins; tie → captain's ballot; still tied → first choice in order.
 * No ballots at all after the deadline → first choice.
 */
export function resolveVote(input: ResolveInput): ResolveResult {
  const t = tally(input.ballots, input.choiceIds);
  const everyoneVoted = input.eligibleCount > 0 && input.ballots.length >= input.eligibleCount;
  const expired = input.now >= input.deadline;
  if (!everyoneVoted && !expired) return { status: "pending", reason: "waiting", tally: t };

  const max = Math.max(0, ...Object.values(t));
  const leaders = input.choiceIds.filter((id) => t[id] === max);
  if (leaders.length === 1 && max > 0) return { status: "resolved", choiceId: leaders[0], tally: t, tieBreak: "none" };

  const captainBallot = input.captainId ? input.ballots.find((b) => b.userId === input.captainId) : undefined;
  if (captainBallot && leaders.includes(captainBallot.choiceId)) {
    return { status: "resolved", choiceId: captainBallot.choiceId, tally: t, tieBreak: "captain" };
  }
  return { status: "resolved", choiceId: leaders[0], tally: t, tieBreak: "order" };
}

export type Gating = { requiredQuestId: string | null; requiredBingoLines: number | null; requiredPoints: number | null };
export type TeamProgress = { completedQuestIds: string[]; bingoLines: number; points: number };

/** Unmet conditions, as French labels. Empty array = unlocked. */
export function unmetConditions(g: Gating, p: TeamProgress, questTitle?: string): string[] {
  const out: string[] = [];
  if (g.requiredQuestId && !p.completedQuestIds.includes(g.requiredQuestId)) {
    out.push(`terminer la quête « ${questTitle ?? "requise"} »`);
  }
  if (g.requiredBingoLines && p.bingoLines < g.requiredBingoLines) {
    out.push(`compléter ${g.requiredBingoLines} ligne${g.requiredBingoLines > 1 ? "s" : ""} de bingo (${p.bingoLines} pour l'instant)`);
  }
  if (g.requiredPoints && p.points < g.requiredPoints) {
    out.push(`atteindre ${g.requiredPoints} pts (${p.points} pour l'instant)`);
  }
  return out;
}
