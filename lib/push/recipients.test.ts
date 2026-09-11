import { describe, expect, it } from "vitest";
import { notMuted, shouldPrune, toggleMuted, uniqueIds, withoutActor } from "./recipients";

describe("uniqueIds", () => {
  it("keeps the first occurrence, in order", () => {
    expect(uniqueIds(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
    expect(uniqueIds([])).toEqual([]);
  });
});

describe("withoutActor", () => {
  it("drops the person who triggered the event", () => {
    expect(withoutActor(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });
  it("keeps everybody when there is no actor (a tick, a cron)", () => {
    expect(withoutActor(["a", "b"], null)).toEqual(["a", "b"]);
    expect(withoutActor(["a", "b"], undefined)).toEqual(["a", "b"]);
  });
  it("returns a copy, never the argument itself", () => {
    const ids = ["a"];
    expect(withoutActor(ids, null)).not.toBe(ids);
  });
});

describe("notMuted", () => {
  const users = [
    { id: "empty", pushMuted: [] },
    { id: "story-off", pushMuted: ["STORY"] },
    { id: "all-off", pushMuted: ["STORY", "QUESTIONS", "ORGANIZER"] },
  ];

  it("an empty list means everything is received", () => {
    expect(notMuted(users, "STORY").map((u) => u.id)).toEqual(["empty"]);
    expect(notMuted(users, "QUESTIONS").map((u) => u.id)).toEqual(["empty", "story-off"]);
    expect(notMuted(users, "ORGANIZER").map((u) => u.id)).toEqual(["empty", "story-off"]);
  });
});

describe("shouldPrune", () => {
  it.each([
    [404, true],
    [410, true],
    [400, false],
    [413, false],
    [429, false],
    [500, false],
    [undefined, false],
  ])("status %s → %s", (status, expected) => {
    expect(shouldPrune(status)).toBe(expected);
  });
});

describe("toggleMuted", () => {
  it("turning a category off adds it, turning it on removes it", () => {
    expect(toggleMuted([], "STORY", false)).toEqual(["STORY"]);
    expect(toggleMuted(["STORY"], "STORY", true)).toEqual([]);
  });
  it("is idempotent: clicking twice writes the same list", () => {
    expect(toggleMuted(["STORY"], "STORY", false)).toEqual(["STORY"]);
    expect(toggleMuted([], "STORY", true)).toEqual([]);
  });
  it("leaves the other categories alone, in order", () => {
    expect(toggleMuted(["QUESTIONS", "ORGANIZER"], "STORY", false)).toEqual(["QUESTIONS", "ORGANIZER", "STORY"]);
    expect(toggleMuted(["QUESTIONS", "STORY", "ORGANIZER"], "STORY", true)).toEqual(["QUESTIONS", "ORGANIZER"]);
  });
  it("never mutates the list it is given", () => {
    const muted = ["STORY"] as const;
    toggleMuted(muted, "QUESTIONS", false);
    expect(muted).toEqual(["STORY"]);
  });
});
