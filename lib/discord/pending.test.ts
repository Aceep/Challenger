import { describe, expect, it } from "vitest";
import { NONE } from "./components";
import {
  PENDING_TTL_MS,
  isPendingExpired,
  pendingExpiry,
  pendingPurgeCutoff,
  readPendingChoices,
  resolvePendingChoice,
  type PendingChoices,
} from "./pending";

const CHOICES: PendingChoices = {
  quests: [{ name: "#3 — Un classique — 20 pts", value: "quest-3" }],
  cells: [{ name: "B2 — un livre voyageur", value: "cell-b2" }],
};

const NOW = new Date("2026-08-28T10:00:00Z");

describe("fiche de lecture en attente", () => {
  it("expire quinze minutes après l’ouverture du formulaire", () => {
    const expiresAt = pendingExpiry(NOW);
    expect(expiresAt.getTime() - NOW.getTime()).toBe(PENDING_TTL_MS);
    expect(isPendingExpired({ expiresAt }, NOW)).toBe(false);
    expect(isPendingExpired({ expiresAt }, new Date(NOW.getTime() + 14 * 60_000))).toBe(false);
    expect(isPendingExpired({ expiresAt }, expiresAt)).toBe(true);
    expect(isPendingExpired({ expiresAt }, new Date(NOW.getTime() + 16 * 60_000))).toBe(true);
  });

  it("garde les fiches expirées une heure avant de les purger", () => {
    const cutoff = pendingPurgeCutoff(NOW);
    expect(cutoff.getTime()).toBeLessThan(NOW.getTime());
    // Ouverte il y a 30 min, la fiche a expiré mais reste lisible, pour dire « expirée » au clic tardif.
    expect(pendingExpiry(new Date(NOW.getTime() - 30 * 60_000)).getTime()).toBeGreaterThan(cutoff.getTime());
    // Ouverte il y a trois heures, plus personne ne la regarde.
    expect(pendingExpiry(new Date(NOW.getTime() - 3 * 3_600_000)).getTime()).toBeLessThan(cutoff.getTime());
  });

  it("relit un instantané d’options, même abîmé", () => {
    expect(readPendingChoices(CHOICES)).toEqual(CHOICES);
    expect(readPendingChoices({})).toEqual({ quests: [], cells: [] });
    expect(readPendingChoices(null)).toEqual({ quests: [], cells: [] });
    expect(readPendingChoices("{}")).toEqual({ quests: [], cells: [] });
    expect(readPendingChoices({ quests: [{ name: "sans valeur" }, 42, { name: "ok", value: "q1" }], cells: "non" })).toEqual({
      quests: [{ name: "ok", value: "q1" }],
      cells: [],
    });
  });

  it("n’accepte qu’un type de lecture connu", () => {
    expect(resolvePendingChoice("type", "GRAPHIQUE", CHOICES)).toEqual({ type: "GRAPHIQUE" });
    expect(resolvePendingChoice("type", "ROMAN", CHOICES)).toEqual({ type: "ROMAN" });
    expect(resolvePendingChoice("type", "BD", CHOICES)).toBeNull();
    expect(resolvePendingChoice("type", NONE, CHOICES)).toBeNull();
  });

  it("refuse une quête ou une case qui n’a pas été proposée", () => {
    expect(resolvePendingChoice("quest", "quest-3", CHOICES)).toEqual({ questId: "quest-3" });
    expect(resolvePendingChoice("cell", "cell-b2", CHOICES)).toEqual({ cellId: "cell-b2" });
    // L’instantané est la seule autorité, une quête d’une autre équipe ne passe pas.
    expect(resolvePendingChoice("quest", "quest-des-voisins", CHOICES)).toBeNull();
    expect(resolvePendingChoice("cell", "quest-3", CHOICES)).toBeNull();
  });

  it("détache la quête ou la case avec « — aucune — »", () => {
    expect(resolvePendingChoice("quest", NONE, CHOICES)).toEqual({ questId: null });
    expect(resolvePendingChoice("cell", NONE, CHOICES)).toEqual({ cellId: null });
  });
});
