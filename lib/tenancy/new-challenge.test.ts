import { describe, expect, it } from "vitest";
import { CHALLENGE_DEFAULTS, DEFAULT_WEEKS, defaultDatesFor, guildChallengeName } from "./new-challenge";

const iso = (d: Date) => d.toISOString();

describe("valeurs par défaut d'un nouveau défi", () => {
  it("démarre le lundi suivant, quel que soit le jour de création", () => {
    // Dimanche 6 septembre 2026 → lundi 7.
    expect(iso(defaultDatesFor(new Date("2026-09-06T22:30:00Z")).startAt)).toBe("2026-09-07T00:00:00.000Z");
    // Mercredi 9 septembre 2026 → lundi 14.
    expect(iso(defaultDatesFor(new Date("2026-09-09T08:00:00Z")).startAt)).toBe("2026-09-14T00:00:00.000Z");
  });

  it("un lundi, propose le lundi d'après (jamais le jour même)", () => {
    expect(iso(defaultDatesFor(new Date("2026-09-07T00:00:00Z")).startAt)).toBe("2026-09-14T00:00:00.000Z");
  });

  it("dure huit semaines", () => {
    const { startAt, endAt } = defaultDatesFor(new Date("2026-09-09T08:00:00Z"));
    expect((endAt.getTime() - startAt.getTime()) / 86_400_000).toBe(DEFAULT_WEEKS * 7);
    expect(endAt.getTime()).toBeGreaterThan(startAt.getTime());
  });

  it("nomme le défi d'après le serveur Discord", () => {
    expect(guildChallengeName("Les Hérissons")).toBe("Défi lecture – Les Hérissons");
    expect(guildChallengeName("  Salem  ")).toBe("Défi lecture – Salem");
  });

  it("tronque à 100 caractères", () => {
    const name = guildChallengeName("x".repeat(200));
    expect(name).toHaveLength(100);
    expect(name.startsWith("Défi lecture – x")).toBe(true);
  });

  it("retombe sur « Défi lecture » sans nom de serveur", () => {
    expect(guildChallengeName()).toBe("Défi lecture");
    expect(guildChallengeName(null)).toBe("Défi lecture");
    expect(guildChallengeName("   ")).toBe("Défi lecture");
  });

  it("propose le barème du règlement", () => {
    expect(CHALLENGE_DEFAULTS.pointsPerPage).toBe(0.1);
    expect(CHALLENGE_DEFAULTS.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
