import type { PushCategory } from "./categories";

/**
 * Who gets a notification, decided without touching the database.
 *
 * The services gather ids (team members, allies, organisers) and hand them over
 * here; every rule that says « not twice », « not the person who just clicked »
 * or « not someone who turned this off » lives in this file, unit-tested, so the
 * hook points stay one line long.
 */

/** Same order, no repeats: a person in two lists is still notified once. */
export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Drops whoever triggered the event. Someone who opens a question does not need
 * their phone to tell them they opened a question.
 */
export function withoutActor(ids: string[], actorId: string | null | undefined): string[] {
  return actorId ? ids.filter((id) => id !== actorId) : [...ids];
}

/**
 * Keeps the people who did not turn that category off. The empty list means
 * « everything is received », so a brand new account passes every filter and a
 * new category needs no data migration.
 */
export function notMuted<T extends { id: string; pushMuted: readonly string[] }>(users: T[], category: PushCategory): T[] {
  return users.filter((user) => !user.pushMuted.includes(category));
}

/**
 * `404 Not Found` / `410 Gone` from a push service: the endpoint is dead for
 * good (notifications revoked, app uninstalled, browser data cleared). Anything
 * else — a timeout, a 500, a rate limit — may well work on the next try, so the
 * row stays and only its failure counter moves.
 */
export function shouldPrune(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

/**
 * Flips one switch. `enabled` is what the person sees (checked = receiving), so
 * enabling *removes* from the muted list. Idempotent, and the order of the list
 * never changes for an unrelated toggle — two clicks in a row write the same row.
 */
export function toggleMuted(muted: readonly PushCategory[], category: PushCategory, enabled: boolean): PushCategory[] {
  const without = muted.filter((c) => c !== category);
  return enabled ? without : [...without, category];
}
