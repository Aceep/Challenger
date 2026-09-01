import { describe, expect, it } from "vitest";
import { canEditBook, editDeadline, inActorEdition } from "./books";

const at = (min: number) => new Date(Date.UTC(2026, 8, 1, 10, min));
const book = { userId: "u1", createdAt: at(0), team: { challengeId: "c1" } };
const player = (id: string) => ({ id, role: "PLAYER" as const, isCaptainOfOwner: false, challengeId: "c1" });

describe("canEditBook", () => {
  it("lets the owner edit within one hour", () => {
    expect(canEditBook(book, player("u1"), at(59))).toBe(true);
    expect(canEditBook(book, player("u1"), at(60))).toBe(true);
  });
  it("refuses the owner after one hour", () => {
    expect(canEditBook(book, player("u1"), at(61))).toBe(false);
  });
  it("never lets another player edit", () => {
    expect(canEditBook(book, player("u2"), at(1))).toBe(false);
  });
  it("lets the captain of the owner's team and the organisers edit anytime", () => {
    expect(canEditBook(book, { ...player("cap"), isCaptainOfOwner: true }, at(600))).toBe(true);
    expect(canEditBook(book, { ...player("org"), role: "ORGANIZER" }, at(600))).toBe(true);
  });
  it("computes the deadline", () => {
    expect(editDeadline(book)).toEqual(at(60));
  });
});

describe("editDeadline pauses during the Sunday verification window", () => {
  // Sunday 2026-09-06, 18:30 Paris = 16:30 UTC (CEST).
  const sundayBook = { userId: "u1", createdAt: new Date("2026-09-06T16:30:00Z"), team: { challengeId: "c1" } };
  it("extends the window by the closure (18:30 + 30 min active + 2 h paused → 21:30 Paris)", () => {
    expect(editDeadline(sundayBook)).toEqual(new Date("2026-09-06T19:30:00Z"));
    expect(canEditBook(sundayBook, player("u1"), new Date("2026-09-06T19:20:00Z"))).toBe(true);
    expect(canEditBook(sundayBook, player("u1"), new Date("2026-09-06T19:31:00Z"))).toBe(false);
  });
});

describe("inActorEdition", () => {
  it("accepts a reading of the edition being played", () => {
    expect(inActorEdition(book, { challengeId: "c1" })).toBe(true);
  });
  it("refuses a reading of another edition", () => {
    expect(inActorEdition(book, { challengeId: "c2" })).toBe(false);
    expect(inActorEdition(book, { challengeId: null })).toBe(false);
  });
  it("accepts a reading attached to no team — it belongs to no edition", () => {
    expect(inActorEdition({ ...book, team: null }, { challengeId: "c2" })).toBe(true);
  });
  it("lets the platform owner through: they organise every edition", () => {
    expect(inActorEdition(book, { challengeId: "c2", isSuperAdmin: true })).toBe(true);
  });
});

describe("canEditBook stops at the edition boundary", () => {
  const foreign = { ...book, team: { challengeId: "c2" } };
  it("refuses an organiser of another edition", () => {
    expect(canEditBook(foreign, { ...player("org"), role: "ORGANIZER" }, at(1))).toBe(false);
  });
  it("refuses the owner and the captain when the reading is played elsewhere", () => {
    expect(canEditBook(foreign, player("u1"), at(1))).toBe(false);
    expect(canEditBook(foreign, { ...player("cap"), isCaptainOfOwner: true }, at(1))).toBe(false);
  });
  it("still lets the platform owner correct it", () => {
    expect(canEditBook(foreign, { ...player("root"), role: "ORGANIZER", isSuperAdmin: true }, at(600))).toBe(true);
  });
});
