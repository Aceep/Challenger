/**
 * Pure scoring functions for reading. No I/O here — keep this testable.
 */

/** Books with fewer pages than this earn half points (pages ÷ 2 before the rate). */
export const SHORT_BOOK_PAGES = 150;

/**
 * Base points for a book: pages × pointsPerPage, rounded down, never negative.
 * Books under SHORT_BOOK_PAGES count half their pages (120 p. at 0.1 → 6 pts).
 */
export function readingPoints(pages: number, pointsPerPage: number): number {
  if (!Number.isFinite(pages) || pages <= 0) return 0;
  if (!Number.isFinite(pointsPerPage) || pointsPerPage <= 0) return 0;
  const effectivePages = pages < SHORT_BOOK_PAGES ? pages / 2 : pages;
  return Math.floor(effectivePages * pointsPerPage);
}

/** Weight of a book towards a quest or a bingo cell: a graphique counts half. */
export function bookWeight(isGraphic: boolean): number {
  return isGraphic ? 0.5 : 1;
}

/** A quest / bingo cell is complete once the attached books weigh at least one full book. */
export function isComplete(weights: number[]): boolean {
  return weights.reduce((n, w) => n + w, 0) >= 1;
}

/** Max books attachable to one quest owner / one bingo cell. */
export const MAX_BOOKS_PER_SLOT = 2;

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
