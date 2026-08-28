import { describe, expect, it } from "vitest";
import {
  applyMultiplier,
  bookWeight,
  effectiveMultiplier,
  effectiveType,
  isComplete,
  isWithinChallenge,
  readingPoints,
  round1,
} from "./reading";

describe("readingPoints", () => {
  it("gives pages/10 from 150 pages, one decimal", () => {
    expect(readingPoints(412)).toBe(41.2);
    expect(readingPoints(150)).toBe(15);
    expect(readingPoints(151)).toBe(15.1);
    expect(readingPoints(159)).toBe(15.9);
  });
  it("halves pages under 150 with commercial rounding to 0,1", () => {
    expect(readingPoints(149)).toBe(7.5);
    expect(readingPoints(120)).toBe(6);
    expect(readingPoints(10)).toBe(0.5);
    expect(readingPoints(1)).toBe(0.1);
    expect(readingPoints(21)).toBe(1.1);
  });
  it("returns 0 for invalid inputs", () => {
    expect(readingPoints(0)).toBe(0);
    expect(readingPoints(-5)).toBe(0);
    expect(readingPoints(100, 0)).toBe(0);
    expect(readingPoints(NaN)).toBe(0);
  });
});

describe("effectiveType", () => {
  it("is graphique when declared or under 150 pages", () => {
    expect(effectiveType(140, false)).toBe("GRAPHIQUE");
    expect(effectiveType(149, false)).toBe("GRAPHIQUE");
    expect(effectiveType(150, false)).toBe("ROMAN");
    expect(effectiveType(300, true)).toBe("GRAPHIQUE");
  });
});

describe("bookWeight / isComplete", () => {
  it("a graphique counts half", () => {
    expect(bookWeight("ROMAN")).toBe(1);
    expect(bookWeight("GRAPHIQUE")).toBe(0.5);
  });
  it("needs one full book equivalent", () => {
    expect(isComplete([])).toBe(false);
    expect(isComplete([0.5])).toBe(false);
    expect(isComplete([0.5, 0.5])).toBe(true);
    expect(isComplete([1])).toBe(true);
    expect(isComplete([1, 0.5])).toBe(true);
  });
});

describe("round1", () => {
  it("rounds half up", () => {
    expect(round1(7.45)).toBe(7.5);
    expect(round1(2.25)).toBe(2.3);
    expect(round1(1.04)).toBe(1);
  });
});

describe("effectiveMultiplier", () => {
  const d = (s: string) => new Date(s);
  it("is 1 with no modifiers", () => {
    expect(effectiveMultiplier([], d("2026-09-01"))).toBe(1);
  });
  it("multiplies only active modifiers", () => {
    const mods = [
      { multiplier: 2, startAt: d("2026-09-01"), endAt: d("2026-09-03") },
      { multiplier: 0.5, startAt: d("2026-09-02"), endAt: d("2026-09-04") },
      { multiplier: 10, startAt: d("2026-10-01"), endAt: d("2026-10-02") },
    ];
    expect(effectiveMultiplier(mods, d("2026-09-01T12:00:00Z"))).toBe(2);
    expect(effectiveMultiplier(mods, d("2026-09-02T12:00:00Z"))).toBe(1);
    expect(effectiveMultiplier(mods, d("2026-09-03T12:00:00Z"))).toBe(0.5);
  });
  it("treats endAt as exclusive", () => {
    const mods = [{ multiplier: 2, startAt: d("2026-09-01"), endAt: d("2026-09-03") }];
    expect(effectiveMultiplier(mods, d("2026-09-03"))).toBe(1);
  });
});

describe("applyMultiplier", () => {
  it("rounds to nearest integer", () => {
    expect(applyMultiplier(41, 0.8)).toBe(32.8);
    expect(applyMultiplier(41, 1.5)).toBe(61.5);
  });
});

describe("isWithinChallenge", () => {
  it("is inclusive on both ends", () => {
    const s = new Date("2026-09-01");
    const e = new Date("2026-09-30");
    expect(isWithinChallenge(s, s, e)).toBe(true);
    expect(isWithinChallenge(e, s, e)).toBe(true);
    expect(isWithinChallenge(new Date("2026-10-01"), s, e)).toBe(false);
  });
});
