/**
 * Defaults for a challenge someone creates themselves, from the web form
 * (`/new`) or from Discord (`/challenger creer`). Pure, no I/O: both paths must
 * propose exactly the same edition, so the rules live here once.
 */

/** Barème and colour a brand-new edition starts with (the organiser tunes them later). */
export const CHALLENGE_DEFAULTS = {
  pointsPerPage: 0.1,
  bingoLineBonus: 25,
  bingoFullBonus: 100,
  color: "#2E4A7D",
} as const;

/** Length of a default challenge, in weeks. */
export const DEFAULT_WEEKS = 8;

const DAY_MS = 86_400_000;
const MONDAY = 1;

/** Discord refuses a name over 100 characters; so does `challengeFields`. */
const NAME_MAX = 100;

/** Name proposed when a Discord server creates its challenge without one. */
const FALLBACK_NAME = "Défi lecture";

/**
 * The dates a new edition is pre-filled with: the **next** Monday at 00:00 UTC,
 * for eight weeks. Always strictly in the future, even when created on a
 * Monday — nobody starts a challenge in the middle of the day it opens.
 */
export function defaultDatesFor(now: Date = new Date()): { startAt: Date; endAt: Date } {
  const days = ((MONDAY - now.getUTCDay() + 7) % 7) || 7;
  const startAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
  return { startAt, endAt: new Date(startAt.getTime() + DEFAULT_WEEKS * 7 * DAY_MS) };
}

/**
 * Name of the challenge a Discord server creates: « Défi lecture – {serveur} ».
 * Falls back on a bare « Défi lecture » when the server name is unknown or
 * empty, and stays within the 100 characters the form accepts.
 */
export function guildChallengeName(guildName?: string | null): string {
  const trimmed = (guildName ?? "").trim();
  if (!trimmed) return FALLBACK_NAME;
  return `${FALLBACK_NAME} – ${trimmed}`.slice(0, NAME_MAX);
}
