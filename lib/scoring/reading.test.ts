import { describe, expect, it } from "vitest";
import {
  applyMultiplier,
  bookWeight,
  effectiveMultiplier,
  isComplete,
  isWithinChallenge,
  readingPoints,
} from "./reading";

describe("readingPoints", () => {
  it("gives 1 point per 10 pages by default rate, rounded down", () => {
    expect(readingPoints(412, 0.1)).toBe(41);
    expect(readingPoints(150, 0.1)).toBe(15);
    expect(readingPoints(159, 0.1)).toBe(15);
  });
  it("halves pages under 150", () => {
    expect(readingPoints(149, 0.1)).toBe(7);
    expect(readingPoints(120, 0.1)).toBe(6);
    expect(readingPoints(10, 0.1)).toBe(0);
    expect(readingPoints(20, 0.1)).toBe(1);
  });
  it("returns 0 for invalid inputs", () => {
    expect(readingPoints(0, 0.1)).toBe(0);
    expect(readingPoints(-5, 0.1)).toBe(0);
    expect(readingPoints(100, 0)).toBe(0);
    expect(readingPoints(NaN, 0.1)).toBe(0);
  });
});

describe("bookWeight / isComplete", () => {
  it("a graphique counts half", () => {
    expect(bookWeight(false)).toBe(1);
    expect(bookWeight(true)).toBe(0.5);
  });
  it("needs one full book equivalent", () => {
    expect(isComplete([])).toBe(false);
    expect(isComplete([0.5])).toBe(false);
    expect(isComplete([0.5, 0.5])).toBe(true);
    expect(isComplete([1])).toBe(true);
    expect(isComplete([1, 0.5])).toBe(true);
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
    expect(applyMultiplier(41, 0.8)).toBe(33);
    expect(applyMultiplier(41, 1.5)).toBe(62);
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
