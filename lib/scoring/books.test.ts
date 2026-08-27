import { describe, expect, it } from "vitest";
import { canEditBook, editDeadline } from "./books";

const at = (min: number) => new Date(Date.UTC(2026, 8, 1, 10, min));
const book = { userId: "u1", createdAt: at(0) };
const player = (id: string) => ({ id, role: "PLAYER" as const, isCaptainOfOwner: false });

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
  it("lets the captain of the owner's team and admins edit anytime", () => {
    expect(canEditBook(book, { ...player("cap"), isCaptainOfOwner: true }, at(600))).toBe(true);
    expect(canEditBook(book, { id: "adm", role: "ADMIN", isCaptainOfOwner: false }, at(600))).toBe(true);
  });
  it("computes the deadline", () => {
    expect(editDeadline(book)).toEqual(at(60));
  });
});
