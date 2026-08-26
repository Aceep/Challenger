import { describe, expect, it } from "vitest";
import { bingoDelta, cellsOfLine, completedLines, isFullCard, lineKeys } from "./bingo";

const row = (r: number, size = 3) => Array.from({ length: size }, (_, c) => ({ row: r, col: c }));

describe("lineKeys / cellsOfLine", () => {
  it("has 2n+2 lines", () => {
    expect(lineKeys(5)).toHaveLength(12);
  });
  it("computes diagonals", () => {
    expect(cellsOfLine("diag:anti", 3)).toEqual([
      { row: 0, col: 2 },
      { row: 1, col: 1 },
      { row: 2, col: 0 },
    ]);
  });
});

describe("completedLines", () => {
  it("detects a row and nothing else", () => {
    expect(completedLines(row(1), 3)).toEqual(["row:1"]);
  });
  it("detects overlapping lines", () => {
    const filled = [...row(0), { row: 1, col: 0 }, { row: 2, col: 0 }];
    expect(completedLines(filled, 3).sort()).toEqual(["col:0", "row:0"]);
  });
  it("is empty when nothing is complete", () => {
    expect(completedLines([{ row: 0, col: 0 }], 3)).toEqual([]);
  });
});

describe("isFullCard", () => {
  it("requires every cell", () => {
    const all = [...row(0), ...row(1), ...row(2)];
    expect(isFullCard(all, 3)).toBe(true);
    expect(isFullCard(all.slice(1), 3)).toBe(false);
  });
});

describe("bingoDelta", () => {
  it("reports gained lines when a cell completes them", () => {
    const before = row(0).slice(0, 2);
    const after = row(0);
    expect(bingoDelta(before, after, 3)).toEqual({ gained: ["row:0"], lost: [] });
  });
  it("reports lost lines when a cell is removed", () => {
    expect(bingoDelta(row(0), row(0).slice(1), 3)).toEqual({ gained: [], lost: ["row:0"] });
  });
  it("includes full card as a pseudo-line", () => {
    const all = [...row(0), ...row(1), ...row(2)];
    const delta = bingoDelta(all.slice(0, 8), all, 3);
    expect(delta.gained).toContain("full");
    expect(delta.gained).toContain("row:2");
  });
});
