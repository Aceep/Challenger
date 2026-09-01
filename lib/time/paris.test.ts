import { describe, expect, it } from "vitest";
import { addActiveHours, dueSundayKey, gameWeek, isNightPause, isVerificationWindow, parisClock, parisInstant, pausedMs, sundayKey } from "./paris";

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

describe("parisInstant / dueSundayKey", () => {
  it("builds Paris instants across DST", () => {
    expect(parisInstant("2026-09-06", 20)).toEqual(new Date("2026-09-06T18:00:00Z"));
    expect(parisInstant("2026-11-01", 20)).toEqual(new Date("2026-11-01T19:00:00Z"));
  });
  it("finds the last Sunday 20:00 that is due", () => {
    expect(dueSundayKey(new Date("2026-09-06T17:00:00Z"))).toBe("2026-08-30"); // Sunday 19:00 Paris: not yet
    expect(dueSundayKey(new Date("2026-09-06T18:00:00Z"))).toBe("2026-09-06");
    expect(dueSundayKey(new Date("2026-09-09T10:00:00Z"))).toBe("2026-09-06");
  });
});

describe("gameWeek", () => {
  // 2026-09-06 and 2026-09-13 are Sundays.
  const week = { start: new Date("2026-09-06T19:00:00Z"), end: new Date("2026-09-13T17:00:00Z") }; // dim. 21 h → dim. 19 h

  it("runs from Sunday 21:00 to the next Sunday 19:00", () => {
    expect(gameWeek(new Date("2026-09-09T10:00:00Z"))).toEqual(week); // mercredi
    expect(gameWeek(new Date("2026-09-07T00:00:00Z"))).toEqual(week); // lundi 02:00 Paris
    expect(gameWeek(new Date("2026-09-13T16:59:00Z"))).toEqual(week); // dimanche 18:59 Paris
  });

  it("keeps the verification window inside the week it closes", () => {
    // Sunday 19:00–21:00 Paris: the week is over (`now` > end) but still the current one.
    expect(gameWeek(new Date("2026-09-13T17:30:00Z"))).toEqual(week);
    expect(gameWeek(new Date("2026-09-13T18:59:00Z"))).toEqual(week);
  });

  it("opens the next week at 21:00 sharp", () => {
    expect(gameWeek(new Date("2026-09-13T19:00:00Z"))).toEqual({ start: new Date("2026-09-13T19:00:00Z"), end: new Date("2026-09-20T17:00:00Z") });
  });

  it("survives both DST switches", () => {
    // Spring forward on Sunday 2026-03-29 at 02:00: the week is one hour short (165 h).
    const spring = gameWeek(new Date("2026-03-25T10:00:00Z"));
    expect(spring).toEqual({ start: new Date("2026-03-22T20:00:00Z"), end: new Date("2026-03-29T17:00:00Z") });
    expect(spring.end.getTime() - spring.start.getTime()).toBe(165 * 3_600_000);
    // Monday 00:30 Paris right after that switch still belongs to the week that just opened.
    expect(gameWeek(new Date("2026-03-29T22:30:00Z")).start).toEqual(new Date("2026-03-29T19:00:00Z"));
    // Fall back on Sunday 2026-10-25 at 03:00: one hour longer (167 h).
    const autumn = gameWeek(new Date("2026-10-21T10:00:00Z"));
    expect(autumn).toEqual({ start: new Date("2026-10-18T19:00:00Z"), end: new Date("2026-10-25T18:00:00Z") });
    expect(autumn.end.getTime() - autumn.start.getTime()).toBe(167 * 3_600_000);
  });
});
