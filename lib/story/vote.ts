/**
 * Pure vote resolution, tie cascade and chapter gating. No I/O.
 */
import { addActiveHours } from "@/lib/time/paris";

export type Ballot = { userId: string; choiceId: string; createdAt: Date };

export type ResolveInput = {
  ballots: Ballot[];
  /** Choice ids in display order. */
  choiceIds: string[];
  /** Applied when the vote expires without a clear majority (falls back to the first choice). */
  defaultChoiceId: string | null;
  /** Members entitled to vote (own team + allies). */
  eligibleCount: number;
  deadline: Date;
  now: Date;
};

export type ResolveResult =
  | { status: "pending"; reason: "waiting" | "quorum"; tally: Record<string, number> }
  | { status: "tie"; leaders: string[]; tally: Record<string, number> }
  | { status: "resolved"; choiceId: string; tally: Record<string, number>; how: "majority" | "default" };

export const QUORUM = 3;

/** Quorum = 3 voters, lowered to the team size for small teams. */
export function quorumFor(eligibleCount: number): number {
  return Math.max(1, Math.min(QUORUM, eligibleCount));
}

export function tally(ballots: Ballot[], choiceIds: string[]): Record<string, number> {
  const t: Record<string, number> = Object.fromEntries(choiceIds.map((id) => [id, 0]));
  for (const b of ballots) if (b.choiceId in t) t[b.choiceId]++;
  return t;
}

/**
 * Before the deadline: resolves as soon as everyone eligible has voted with a
 * clear majority; an exact tie starts the tie cascade. At the deadline: a clear
 * majority with quorum wins, anything else (no quorum, tie) → default choice.
 */
export function resolveVote(input: ResolveInput): ResolveResult {
  const t = tally(input.ballots, input.choiceIds);
  const counted = input.ballots.filter((b) => b.choiceId in t).length;
  const quorum = quorumFor(input.eligibleCount);
  const everyoneVoted = input.eligibleCount > 0 && counted >= input.eligibleCount;
  const expired = input.now >= input.deadline;
  const max = Math.max(0, ...Object.values(t));
  const leaders = input.choiceIds.filter((id) => t[id] === max);
  const clear = leaders.length === 1 && max > 0 && counted >= quorum;

  if (expired) {
    if (clear) return { status: "resolved", choiceId: leaders[0], tally: t, how: "majority" };
    const fallback = input.defaultChoiceId && input.choiceIds.includes(input.defaultChoiceId) ? input.defaultChoiceId : input.choiceIds[0];
    return { status: "resolved", choiceId: fallback, tally: t, how: "default" };
  }
  if (!everyoneVoted) return { status: "pending", reason: counted < quorum ? "quorum" : "waiting", tally: t };
  if (clear) return { status: "resolved", choiceId: leaders[0], tally: t, how: "majority" };
  if (leaders.length > 1 && max > 0) return { status: "tie", leaders, tally: t };
  return { status: "pending", reason: "quorum", tally: t };
}

export type TieStage = "CAPTAIN" | "DEPUTY" | "ANY";
export const TIE_STAGE_HOURS = 5;

/** Who may break a tie: captain for 5 active hours, then the deputy for 5 more, then anyone (with admin confirmation). */
export function tieCascadeStage(tieSince: Date, now: Date): TieStage {
  if (now < addActiveHours(tieSince, TIE_STAGE_HOURS)) return "CAPTAIN";
  if (now < addActiveHours(tieSince, TIE_STAGE_HOURS * 2)) return "DEPUTY";
  return "ANY";
}

/** Whether `role` may break a tie at `stage`. */
export function canBreakTie(stage: TieStage, role: "captain" | "deputy" | "member" | "admin"): boolean {
  if (role === "admin") return true;
  if (role === "captain") return true;
  if (role === "deputy") return stage !== "CAPTAIN";
  return stage === "ANY";
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
