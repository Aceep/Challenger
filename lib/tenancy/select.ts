/**
 * Which challenge is "the current one"? Pure selection rules, no I/O.
 *
 * Several challenges coexist: a person may organise one edition, play in
 * another and have finished a third. These helpers pick a single one, both for
 * the web session (cookie hint) and for a Discord interaction (guild id).
 */

/** Cookie carrying the challenge the player last looked at (written in step 2). */
export const CHALLENGE_COOKIE = "challenge";

export type ChallengeLike = {
  id: string;
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  startAt: Date;
};

export type MembershipLike<C extends ChallengeLike = ChallengeLike> = {
  challengeId: string;
  role: "ORGANIZER" | "PLAYER";
  challenge: C;
};

/** ACTIVE first, then the latest `startAt`. */
function byRelevance(a: ChallengeLike, b: ChallengeLike): number {
  const active = Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE");
  return active !== 0 ? active : b.startAt.getTime() - a.startAt.getTime();
}

/**
 * The membership to work in: the preferred challenge when the person belongs to
 * it, otherwise their most relevant one (ACTIVE first, then the latest edition).
 */
export function pickCurrentMembership<M extends MembershipLike>(memberships: M[], preferredId?: string | null): M | null {
  if (!memberships.length) return null;
  const preferred = preferredId ? memberships.find((m) => m.challengeId === preferredId) : undefined;
  if (preferred) return preferred;
  return [...memberships].sort((a, b) => byRelevance(a.challenge, b.challenge))[0];
}

/**
 * The challenge a Discord server plays right now. A community reuses its server
 * every edition, so several challenges may share a guild: the ACTIVE one wins,
 * otherwise the one that started last.
 */
export function pickChallengeForGuild<C extends ChallengeLike>(candidates: C[]): C | null {
  if (!candidates.length) return null;
  return [...candidates].sort(byRelevance)[0];
}
