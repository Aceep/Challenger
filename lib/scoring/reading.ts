/**
 * Pure scoring functions for readings. No I/O here — keep this testable.
 */

/** Readings under this page count are "graphique" in every respect (half points, ½ credit). */
export const SHORT_BOOK_PAGES = 150;

export type BookType = "ROMAN" | "GRAPHIQUE";

/** Commercial rounding to one decimal (7.45 → 7.5). */
export function round1(x: number): number {
  return Math.round((x + Number.EPSILON) * 10) / 10;
}

/**
 * Effective type of a reading: declared graphique, or fewer than 150 pages.
 * The rule is spec §3/§6 — a 140-page novel is a graphique "à tous égards".
 */
export function effectiveType(pages: number, declaredGraphic: boolean): BookType {
  return declaredGraphic || pages < SHORT_BOOK_PAGES ? "GRAPHIQUE" : "ROMAN";
}

/**
 * Reading points: pages × rate (rate 0.1 = pages/10), pages halved under 150,
 * rounded commercially to 0,1. 149 p. → 7,5 ; 150 p. → 15 ; 151 p. → 15,1.
 * A declared graphique of ≥150 pages keeps full page points (only the credit halves).
 */
export function readingPoints(pages: number, pointsPerPage = 0.1): number {
  if (!Number.isFinite(pages) || pages <= 0) return 0;
  if (!Number.isFinite(pointsPerPage) || pointsPerPage <= 0) return 0;
  const effectivePages = pages < SHORT_BOOK_PAGES ? pages / 2 : pages;
  return round1(effectivePages * pointsPerPage);
}

/** Weight of a reading towards a quest or a bingo cell: a graphique counts half. */
export function bookWeight(type: BookType): number {
  return type === "GRAPHIQUE" ? 0.5 : 1;
}

/** A quest / bingo cell is complete once the attached readings weigh at least one full book. */
export function isComplete(weights: number[]): boolean {
  return weights.reduce((n, w) => n + w, 0) >= 1;
}

/** Max readings attachable to one quest (per team) / one bingo cell. */
export const MAX_BOOKS_PER_SLOT = 2;

export type ActiveModifier = { multiplier: number; startAt: Date; endAt: Date };

/** Product of all modifiers active at `at`. 1 when none. */
export function effectiveMultiplier(modifiers: ActiveModifier[], at: Date): number {
  return modifiers
    .filter((m) => m.startAt <= at && at < m.endAt)
    .reduce((acc, m) => acc * m.multiplier, 1);
}

/** Final amount written to the ledger (one decimal). */
export function applyMultiplier(baseAmount: number, multiplier: number): number {
  return round1(baseAmount * multiplier);
}

/** Points only count inside the challenge window. */
export function isWithinChallenge(at: Date, startAt: Date, endAt: Date): boolean {
  return startAt <= at && at <= endAt;
}
