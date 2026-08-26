/**
 * Pure bingo line detection. A "line" is a full row, column or diagonal.
 * Line keys are stable strings used as ledger refIds so bonuses are never
 * awarded twice: "row:2", "col:0", "diag:main", "diag:anti", "full".
 */

export type CellPos = { row: number; col: number };

export function lineKeys(size: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < size; i++) keys.push(`row:${i}`, `col:${i}`);
  keys.push("diag:main", "diag:anti");
  return keys;
}

/** Cells belonging to a line key. */
export function cellsOfLine(key: string, size: number): CellPos[] {
  const [kind, arg] = key.split(":");
  const cells: CellPos[] = [];
  for (let i = 0; i < size; i++) {
    if (kind === "row") cells.push({ row: Number(arg), col: i });
    else if (kind === "col") cells.push({ row: i, col: Number(arg) });
    else if (kind === "diag" && arg === "main") cells.push({ row: i, col: i });
    else if (kind === "diag" && arg === "anti") cells.push({ row: i, col: size - 1 - i });
  }
  return cells;
}

/** Keys of every line fully covered by `filled`. */
export function completedLines(filled: CellPos[], size: number): string[] {
  const set = new Set(filled.map((c) => `${c.row},${c.col}`));
  return lineKeys(size).filter((key) =>
    cellsOfLine(key, size).every((c) => set.has(`${c.row},${c.col}`)),
  );
}

export function isFullCard(filled: CellPos[], size: number): boolean {
  const set = new Set(filled.map((c) => `${c.row},${c.col}`));
  return set.size >= size * size;
}

/**
 * Diff of completed lines between two fill states. `gained` should be awarded,
 * `lost` should be reversed. "full" is included as a pseudo-line.
 */
export function bingoDelta(before: CellPos[], after: CellPos[], size: number) {
  const b = new Set(completedLines(before, size));
  const a = new Set(completedLines(after, size));
  if (isFullCard(before, size)) b.add("full");
  if (isFullCard(after, size)) a.add("full");
  return {
    gained: [...a].filter((k) => !b.has(k)),
    lost: [...b].filter((k) => !a.has(k)),
  };
}
