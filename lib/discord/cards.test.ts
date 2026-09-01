import { describe, expect, it } from "vitest";
import { GUIDE_BUTTON_LABEL, guideCard, pickerPrompt, readingCard, readingConfirmation, type ReadingCardInput } from "./cards";
import { APP_URL } from "./help";

/** Espace insécable : ce que la typographie française attend, et ce qu'on vérifie. */
const NB = "\u00a0";

const TEAM = { name: "Les Hérissons", color: "#6366f1", discordChannelId: "111", discordLibraryChannelId: "222" };

const READING: ReadingCardInput = {
  reader: "Alycia",
  teamName: "Les Hérissons",
  teamColor: "#6366f1",
  title: "Le Horla",
  author: "Guy de Maupassant",
  pages: 312,
  type: "ROMAN",
  points: 31.2,
  detail: "Quête 3 validée",
  kind: "new",
};

/** Toute la copie produite par le module, pour les contrôles transverses. */
function allStrings(): string[] {
  const guide = guideCard(TEAM);
  const created = readingCard({ ...READING, title: "Le livre « perdu »" });
  const updated = readingCard({ ...READING, kind: "update" });
  return [
    guide.title,
    guide.description,
    guide.footer?.text,
    created.author?.name,
    created.title,
    created.description,
    created.footer?.text,
    updated.author?.name,
    updated.description,
    readingConfirmation(READING),
    readingConfirmation({ ...READING, kind: "update" }),
    pickerPrompt(READING, { quests: false, cells: false }),
    pickerPrompt(READING, { quests: true, cells: true }),
  ].filter((s): s is string => typeof s === "string");
}

describe("cartes Discord", () => {
  it("la carte guide tient dans un embed et annonce le bouton", () => {
    const card = guideCard(TEAM);
    expect(card.title).toContain("Les Hérissons");
    expect(card.description!.length).toBeLessThanOrEqual(4096);
    expect(card.description).toContain("/ajouter-un-livre");
    expect(card.description).toContain("/help");
    expect(card.description).toContain(`19${NB}h`);
    expect(card.description).toContain(APP_URL());
    expect(card.url).toBe(`${APP_URL()}/books`);
    // Le bouton est posé par le service, mais son libellé fait partie de la carte.
    expect(GUIDE_BUTTON_LABEL).toBe("J’ai fini un livre");
  });

  it("la carte guide prend la couleur de l'équipe", () => {
    expect(guideCard(TEAM).color).toBe(0x6366f1);
    expect(guideCard({ ...TEAM, color: "" }).color).toBe(0);
  });

  it("la carte de lecture affiche le lecteur, le livre et le delta", () => {
    const card = readingCard(READING);
    expect(card.author?.name).toBe("Alycia a terminé un livre");
    expect(card.title).toContain("Le Horla");
    expect(card.description).toContain("Guy de Maupassant");
    expect(card.description).toContain(`312${NB}p.`);
    expect(card.description).toContain("roman");
    expect(card.description).toContain(`+31,2${NB}pts`);
    expect(card.description).toContain("Quête 3 validée");
    expect(card.color).toBe(0x6366f1);
    expect(card.footer?.text).toContain("/modifier-un-livre");
  });

  it("la carte de lecture reste lisible sans points ni détail", () => {
    const card = readingCard({ ...READING, points: 0, detail: "", teamName: null, teamColor: null });
    expect(card.description).not.toContain("undefined");
    expect(card.description).not.toContain("\n\n");
    expect(card.description!.trim()).toBe(card.description);
    expect(card.description).toContain(`312${NB}p.`);
    expect(card.color).toBe(0);
  });

  it("la carte de lecture porte la couverture en vignette, et rien d'autre", () => {
    const cover = "https://covers.openlibrary.org/b/id/10675378-M.jpg";
    expect(readingCard({ ...READING, coverUrl: cover }).thumbnail).toEqual({ url: cover });
    expect(readingCard(READING).thumbnail).toBeUndefined();
    expect(readingCard({ ...READING, coverUrl: null }).thumbnail).toBeUndefined();
    expect(readingCard({ ...READING, coverUrl: "https://exemple.test/couverture.jpg" }).thumbnail).toBeUndefined();
  });

  it("la carte de modification le dit", () => {
    const card = readingCard({ ...READING, kind: "update" });
    expect(card.author?.name).toContain("corrigé");
    // Une correction n'invite pas à corriger de nouveau dans l'heure.
    expect(card.footer).toBeUndefined();
  });

  it("la confirmation éphémère reprend le titre et le détail", () => {
    const created = readingConfirmation(READING);
    expect(created).toContain("Le Horla");
    expect(created).toContain(`+31,2${NB}pts`);
    expect(created).toContain("Quête 3 validée");

    const updated = readingConfirmation({ ...READING, kind: "update" });
    expect(updated).toContain("Lecture modifiée");
    expect(updated).toContain("Le Horla");

    const bare = readingConfirmation({ title: "Le Horla", points: 0, detail: "", kind: "new" });
    expect(bare).not.toContain(" · ");
    expect(bare).not.toContain("undefined");
  });

  it("annonce les menus vides sans les inventer", () => {
    const full = pickerPrompt({ title: "Le Horla", pages: 312 }, { quests: true, cells: true });
    expect(full).toContain(`312${NB}p.`);
    expect(full).not.toContain("Aucune");

    const empty = pickerPrompt({ title: "Le Horla", pages: 312 }, { quests: false, cells: false });
    expect(empty).toContain("Aucune quête ouverte");
    expect(empty).toContain("Aucune case libre");
  });

  it("la typographie française est respectée", () => {
    for (const s of allStrings()) {
      // Apostrophe courbe partout, espace insécable avant une ponctuation double.
      expect(s, s).not.toContain("'");
      expect(s, s).not.toMatch(/ [:;!?\u00bb]/u);
      expect(s, s).not.toMatch(/\u00ab(?!\u00a0)/u);
      expect(s, s).not.toMatch(/(?<!\u00a0)\u00bb/u);
    }
    // Les guillemets d'un titre saisi par un joueur sont durcis aussi.
    expect(readingCard({ ...READING, title: "Le livre « perdu »" }).title).toContain(`«${NB}perdu${NB}»`);
  });
});
