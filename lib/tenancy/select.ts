/**
 * Which challenge is "the current one"? Pure selection rules, no I/O.
 *
 * Several challenges coexist: a person may organise one edition, play in
 * another and have finished a third. These helpers pick a single one, both for
 * the web session (cookie hint) and for a Discord interaction (guild id).
 */

/**
 * Cookie carrying the challenge the person last switched to. Written by
 * `switchChallengeAction` (Aide › Édition, admin rail, admin › Défi), cleared on
 * sign-out, read by `lib/dal.ts`.
 */
export const CHALLENGE_COOKIE = "challenge";

export type ChallengeLike = {
  id: string;
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  startAt: Date;
  endAt: Date;
};

export type MembershipLike<C extends ChallengeLike = ChallengeLike> = {
  challengeId: string;
  role: "ORGANIZER" | "PLAYER";
  challenge: C;
};

/** A challenge, or anything wrapping one (a membership, a switchable edition). */
type Relevant = ChallengeLike | { challenge: ChallengeLike };

const challengeOf = (item: Relevant): ChallengeLike => ("challenge" in item ? item.challenge : item);

/** One day of grace after `endAt`, the same the tick uses. */
const GRACE_MS = 86_400_000;

/**
 * 0 = ACTIVE and running now, 1 = ACTIVE and upcoming, 2 = ACTIVE but over,
 * 3 = DRAFT, 4 = FINISHED. A test edition created for next year must not
 * steal the screen from the one people are reading for today.
 */
function tier(c: ChallengeLike, now: number): number {
  if (c.status === "ACTIVE") {
    if (now < c.startAt.getTime()) return 1;
    if (now > c.endAt.getTime() + GRACE_MS) return 2;
    return 0;
  }
  return c.status === "DRAFT" ? 3 : 4;
}

function byRelevance(a: ChallengeLike, b: ChallengeLike, now: number): number {
  const ta = tier(a, now);
  const tb = tier(b, now);
  if (ta !== tb) return ta - tb;
  // Upcoming: the soonest first. Anything else: the most recently started first.
  return ta === 1 ? a.startAt.getTime() - b.startAt.getTime() : b.startAt.getTime() - a.startAt.getTime();
}

/**
 * Editions in the order a person expects to see them: the one running today,
 * then the next to start, then the rest by recency. Accepts challenges or
 * anything holding one (memberships, switchable editions). Never mutates.
 */
export function sortByRelevance<T extends Relevant>(items: T[], now: Date = new Date()): T[] {
  const t = now.getTime();
  return [...items].sort((a, b) => byRelevance(challengeOf(a), challengeOf(b), t));
}

/**
 * The membership to work in: the preferred challenge when the person belongs to
 * it, otherwise their most relevant one (ACTIVE first, then the latest edition).
 */
export function pickCurrentMembership<M extends MembershipLike>(memberships: M[], preferredId?: string | null): M | null {
  if (!memberships.length) return null;
  const preferred = preferredId ? memberships.find((m) => m.challengeId === preferredId) : undefined;
  if (preferred) return preferred;
  return sortByRelevance(memberships)[0];
}

/**
 * The challenge a Discord server plays right now. A community reuses its server
 * every edition, so several challenges may share a guild: the ACTIVE one wins,
 * otherwise the one that started last.
 */
export function pickChallengeForGuild<C extends ChallengeLike>(candidates: C[]): C | null {
  if (!candidates.length) return null;
  return sortByRelevance(candidates)[0];
}

/**
 * Where someone lands after switching edition. The caller asks for a page
 * (`/admin` from the admin desk, `/home` from Aide), the rule caps it: only an
 * organiser of the target edition may land on the admin desk.
 */
export function switchLanding(role: "ORGANIZER" | "PLAYER", requested?: string | null): "/home" | "/admin" {
  return requested === "/admin" && role === "ORGANIZER" ? "/admin" : "/home";
}
