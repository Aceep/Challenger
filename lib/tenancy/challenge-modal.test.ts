import { describe, expect, it } from "vitest";
import { LIMIT, modalPayload, TEXT_STYLE } from "@/lib/discord/components";
import {
  CHALLENGE_FIELD,
  CHALLENGE_MODAL_ID,
  CHALLENGE_MODAL_TITLE,
  TEAMS_MAX,
  TEAM_PALETTE,
  WEEKS_MAX,
  challengeModalInputs,
  formatFrDate,
  parseChallengeModal,
  parseFrDate,
  parseTeamLines,
} from "./challenge-modal";

/** A Wednesday: the pre-filled start date must be the Monday after it. */
const NOW = new Date("2026-09-09T14:00:00.000Z");

const values = (over: Partial<Record<string, string>> = {}) => ({
  [CHALLENGE_FIELD.name]: "Le défi de l’hiver",
  [CHALLENGE_FIELD.start]: "05/01/2026",
  [CHALLENGE_FIELD.weeks]: "8",
  [CHALLENGE_FIELD.teams]: "Les Renards\nLes Hérissons",
  ...over,
});

const DAY = 86_400_000;

describe("formulaire de /challenger creer", () => {
  it("tient dans les limites d'une modale Discord", () => {
    const inputs = challengeModalInputs({ guildName: "Les Lecteurs du dimanche", now: NOW });
    expect(inputs).toHaveLength(4);
    expect(inputs.length).toBeLessThanOrEqual(LIMIT.rows);
    expect(CHALLENGE_MODAL_TITLE.length).toBeLessThanOrEqual(LIMIT.modalTitle);
    for (const i of inputs) {
      expect(i.label.length, i.customId).toBeLessThanOrEqual(LIMIT.inputLabel);
      expect((i.placeholder ?? "").length, i.customId).toBeLessThanOrEqual(LIMIT.placeholder);
      if (i.maxLength !== undefined && i.value !== undefined) expect(i.value.length, i.customId).toBeLessThanOrEqual(i.maxLength);
    }
    // Le payload réel se construit sans rien perdre.
    const payload = modalPayload({ customId: CHALLENGE_MODAL_ID, title: CHALLENGE_MODAL_TITLE, inputs }) as { components: unknown[] };
    expect(payload.components).toHaveLength(4);
  });

  it("pré-remplit le nom du serveur, le lundi suivant et huit semaines", () => {
    const inputs = challengeModalInputs({ guildName: "Les Lecteurs du dimanche", now: NOW });
    const by = (id: string) => inputs.find((i) => i.customId === id)!;
    expect(by(CHALLENGE_FIELD.name).value).toBe("Défi lecture – Les Lecteurs du dimanche");
    expect(by(CHALLENGE_FIELD.start).value).toBe("14/09/2026");
    expect(by(CHALLENGE_FIELD.weeks).value).toBe("8");
    // Les équipes sont la seule chose qu'on ne peut pas deviner.
    expect(by(CHALLENGE_FIELD.teams).value).toBeUndefined();
    expect(by(CHALLENGE_FIELD.teams).style).toBe(TEXT_STYLE.PARAGRAPH);
  });

  it("propose huit couleurs distinctes, en hexadécimal", () => {
    expect(TEAM_PALETTE).toHaveLength(8);
    expect(new Set(TEAM_PALETTE).size).toBe(8);
    for (const c of TEAM_PALETTE) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("date JJ/MM/AAAA", () => {
  it("lit une date à minuit UTC, avec ou sans zéro initial", () => {
    expect(parseFrDate("05/01/2026")?.toISOString()).toBe("2026-01-05T00:00:00.000Z");
    expect(parseFrDate("5/1/2026")?.toISOString()).toBe("2026-01-05T00:00:00.000Z");
    expect(parseFrDate("  05/01/2026  ")?.toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("refuse un jour qui n'existe pas, bissextiles comprises", () => {
    expect(parseFrDate("31/02/2026")).toBeNull();
    expect(parseFrDate("29/02/2026")).toBeNull();
    expect(parseFrDate("29/02/2028")?.toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(parseFrDate("31/04/2026")).toBeNull();
  });

  it("refuse ce qui n'est pas une date", () => {
    for (const bad of ["", "demain", "2026-01-05", "05/01/26", "05-01-2026", "05/13/2026", "0/1/2026"]) {
      expect(parseFrDate(bad), bad).toBeNull();
    }
  });

  it("réécrit une date au format du formulaire", () => {
    expect(formatFrDate(new Date("2026-01-05T00:00:00.000Z"))).toBe("05/01/2026");
  });
});

describe("lecture des équipes", () => {
  it("lit une équipe par ligne et ignore les lignes vides", () => {
    const r = parseTeamLines("  Les Renards  \n\n Les Hérissons \n\n");
    expect(r.ok && r.data.map((t) => t.name)).toEqual(["Les Renards", "Les Hérissons"]);
  });

  it("accepte une couleur en suffixe et distribue la palette sinon", () => {
    const r = parseTeamLines("Les Renards, #D97706\nLes Hiboux\nLes Loutres,#123abc");
    expect(r.ok && r.data).toEqual([
      { name: "Les Renards", color: "#d97706" },
      { name: "Les Hiboux", color: TEAM_PALETTE[1] },
      { name: "Les Loutres", color: "#123abc" },
    ]);
  });

  it("refuse une seule équipe et plus de douze", () => {
    expect(parseTeamLines("Les Renards")).toMatchObject({ ok: false });
    const twelve = Array.from({ length: TEAMS_MAX }, (_, i) => `Équipe ${i + 1}`).join("\n");
    expect(parseTeamLines(twelve).ok).toBe(true);
    expect(parseTeamLines(`${twelve}\nÉquipe 13`)).toMatchObject({ ok: false });
  });

  it("refuse deux équipes qui donneraient le même rôle Discord", () => {
    expect(parseTeamLines("Les Hérissons\nles herissons")).toMatchObject({ ok: false });
  });

  it("refuse une couleur sans nom et un nom trop long", () => {
    expect(parseTeamLines("Les Renards\n, #d97706")).toMatchObject({ ok: false });
    expect(parseTeamLines(`Les Renards\n${"a".repeat(61)}`)).toMatchObject({ ok: false });
  });
});

describe("lecture du formulaire complet", () => {
  it("rend le défi, ses dates et ses équipes", () => {
    const r = parseChallengeModal(values(), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.name).toBe("Le défi de l’hiver");
    expect(r.data.startAt.toISOString()).toBe("2026-01-05T00:00:00.000Z");
    // Huit semaines, jour pour jour.
    expect(r.data.endAt.getTime() - r.data.startAt.getTime()).toBe(8 * 7 * DAY);
    expect(r.data.teams).toHaveLength(2);
  });

  it("borne la durée", () => {
    expect(parseChallengeModal(values({ [CHALLENGE_FIELD.weeks]: "0" }), NOW)).toMatchObject({ ok: false });
    expect(parseChallengeModal(values({ [CHALLENGE_FIELD.weeks]: String(WEEKS_MAX + 1) }), NOW)).toMatchObject({ ok: false });
    expect(parseChallengeModal(values({ [CHALLENGE_FIELD.weeks]: "huit" }), NOW)).toMatchObject({ ok: false });
    expect(parseChallengeModal(values({ [CHALLENGE_FIELD.weeks]: " 1 " }), NOW).ok).toBe(true);
  });

  it("refuse un nom vide et une date illisible, avec une phrase à lire", () => {
    for (const bad of [values({ [CHALLENGE_FIELD.name]: "   " }), values({ [CHALLENGE_FIELD.start]: "bientôt" })]) {
      const r = parseChallengeModal(bad, NOW);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
    }
  });

  it("rattrape une année tapée de travers", () => {
    expect(parseChallengeModal(values({ [CHALLENGE_FIELD.start]: "05/01/2019" }), NOW)).toMatchObject({ ok: false });
    expect(parseChallengeModal(values({ [CHALLENGE_FIELD.start]: "05/01/2036" }), NOW)).toMatchObject({ ok: false });
  });
});
