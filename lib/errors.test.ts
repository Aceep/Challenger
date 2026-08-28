import { describe, expect, it, vi } from "vitest";
import { GameError, GENERIC_ERROR, userMessage } from "./errors";

describe("userMessage", () => {
  it("shows rule errors verbatim", () => {
    expect(userMessage(new GameError("La case B3 est déjà validée"))).toBe("La case B3 est déjà validée");
  });
  it("maps known Prisma codes", () => {
    expect(userMessage({ code: "P2002" })).toBe("Cette valeur existe déjà.");
    expect(userMessage({ code: "P2025" })).toContain("Introuvable");
  });
  it("hides unexpected errors behind a generic message with a reference", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const msg = userMessage(new TypeError("boom"));
    expect(msg).toContain(GENERIC_ERROR);
    expect(msg).toMatch(/réf\. [a-z0-9]{5}/);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
