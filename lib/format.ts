/** French number formatting shared by server and client components. */

const pts = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** 7.5 → "7,5", 15 → "15", -3.2 → "−3,2". */
export function fmtPoints(n: number | string | { toString(): string }): string {
  return pts.format(Number(n));
}

/** "+7,5" / "−3" with sign. */
export function fmtDelta(n: number | string | { toString(): string }): string {
  const v = Number(n);
  return v >= 0 ? `+${pts.format(v)}` : pts.format(v);
}

export const BOOK_TYPE_LABEL = { ROMAN: "roman", GRAPHIQUE: "graphique" } as const;
