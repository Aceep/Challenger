import { describe, expect, it } from "vitest";
import { addActiveHours, isNightPause, isVerificationWindow, parisClock, pausedMs, sundayKey } from "./paris";

describe("isVerificationWindow", () => {
  it("is Sunday 19:00–21:00 Paris in summer time (UTC+2)", () => {
    expect(isVerificationWindow(new Date("2026-09-06T16:59:00Z"))).toBe(false);
    expect(isVerificationWindow(new Date("2026-09-06T17:00:00Z"))).toBe(true);
    expect(isVerificationWindow(new Date("2026-09-06T18:59:00Z"))).toBe(true);
    expect(isVerificationWindow(new Date("2026-09-06T19:00:00Z"))).toBe(false);
  });
  it("handles the DST switch on Sunday 2026-10-25 (UTC+1 from 03:00)", () => {
    expect(isVerificationWindow(new Date("2026-10-25T17:30:00Z"))).toBe(false); // 18:30 Paris
    expect(isVerificationWindow(new Date("2026-10-25T18:00:00Z"))).toBe(true); // 19:00 Paris
    expect(isVerificationWindow(new Date("2026-10-25T20:00:00Z"))).toBe(false); // 21:00 Paris
  });
  it("ignores other days", () => {
    expect(isVerificationWindow(new Date("2026-09-05T17:30:00Z"))).toBe(false);
  });
});

describe("parisClock / isNightPause", () => {
  it("reads local Paris time", () => {
    expect(parisClock(new Date("2026-09-06T22:30:00Z"))).toEqual({ weekday: 1, hour: 0, minute: 30 });
    expect(isNightPause(new Date("2026-09-06T22:30:00Z"))).toBe(true);
    expect(isNightPause(new Date("2026-09-07T06:00:00Z"))).toBe(false); // 08:00 Paris
    expect(isNightPause(new Date("2026-09-07T05:59:00Z"))).toBe(true);
  });
});

describe("addActiveHours", () => {
  it("adds hours normally during the day", () => {
    expect(addActiveHours(new Date("2026-09-07T08:00:00Z"), 5)).toEqual(new Date("2026-09-07T13:00:00Z"));
  });
  it("skips the 00:00–08:00 pause", () => {
    // 22:00 Paris (20:00Z) + 5 h → 2 h before midnight, then resume at 08:00 for 3 h → 11:00 Paris (09:00Z)
    expect(addActiveHours(new Date("2026-09-07T20:00:00Z"), 5)).toEqual(new Date("2026-09-08T09:00:00Z"));
  });
  it("pausedMs measures overlap", () => {
    expect(pausedMs(new Date("2026-09-07T20:00:00Z"), new Date("2026-09-08T09:00:00Z"), isNightPause)).toBe(8 * 3_600_000);
  });
});

describe("sundayKey", () => {
  it("returns the Sunday closing the week", () => {
    expect(sundayKey(new Date("2026-09-02T10:00:00Z"))).toBe("2026-09-06");
    expect(sundayKey(new Date("2026-09-06T18:00:00Z"))).toBe("2026-09-06");
    expect(sundayKey(new Date("2026-09-06T22:30:00Z"))).toBe("2026-09-13"); // Monday 00:30 Paris
  });
});
