/**
 * Pure scoring functions for reading. No I/O here — keep this testable.
 */

/** Base points for a book: pages × pointsPerPage, rounded down, never negative. */
export function readingPoints(pages: number, pointsPerPage: number): number {
  if (!Number.isFinite(pages) || pages <= 0) return 0;
  if (!Number.isFinite(pointsPerPage) || pointsPerPage <= 0) return 0;
  return Math.floor(pages * pointsPerPage);
}

export type ActiveModifier = { multiplier: number; startAt: Date; endAt: Date };

/** Product of all modifiers active at `at`. 1 when none. */
export function effectiveMultiplier(modifiers: ActiveModifier[], at: Date): number {
  return modifiers
    .filter((m) => m.startAt <= at && at < m.endAt)
    .reduce((acc, m) => acc * m.multiplier, 1);
}

/** Final amount written to the ledger. */
export function applyMultiplier(baseAmount: number, multiplier: number): number {
  return Math.round(baseAmount * multiplier);
}

/** Points only count inside the challenge window. */
export function isWithinChallenge(at: Date, startAt: Date, endAt: Date): boolean {
  return startAt <= at && at <= endAt;
}
