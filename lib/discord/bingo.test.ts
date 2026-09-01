import { describe, expect, it } from "vitest";
import { BINGO_MARK, bingoArt, bingoCard, bingoCellState, type BingoCardCell, type BingoCardInput } from "./bingo";
import { APP_URL } from "./help";

/** Espace insécable : ce que la typographie française attend, et ce qu'on vérifie. */
const NB = " ";

const cell = (label: string, prompt: string, o: Partial<BingoCardCell> = {}): BingoCardCell => ({
  label,
  prompt,
  weight: 0,
  complete: false,
  books: [],
  ...o,
});

const ROMAN = (title: string, owner: string) => ({ title, owner, type: "ROMAN" as const });
const GRAPHIQUE = (title: string, owner: string) => ({ title, owner, type: "GRAPHIQUE" as const });

/** Une grille 3×3 : 4 cases validées (dont la première ligne), 1 en attente, 4 libres. */
const CELLS: BingoCardCell[] = [
  cell("A1", "Un livre d’avant 1900", { weight: 1, complete: true, books: [ROMAN("Le Horla", "Alycia")] }),
  cell("B1", "Une autrice africaine", { weight: 1, complete: true, books: [GRAPHIQUE("Aya de Yopougon", "Marie"), GRAPHIQUE("Muzungu", "Sam")] }),
  cell("C1", "Un titre en un seul mot", { weight: 1, complete: true, books: [ROMAN("Ravage", "Sam")] }),
  cell("A2", "Un livre traduit du japonais", { weight: 0.5, books: [GRAPHIQUE("Kitchen", "Marie")] }),
  cell("B2", "Un roman policier"),
  cell("C2", "Un livre de plus de 500 pages", { weight: 1, complete: true, books: [ROMAN("Les Misérables", "Alycia")] }),
  cell("A3", "Un recueil de nouvelles"),
  cell("B3", "Un livre offert"),
  cell("C3", "Un classique"),
];

const CARD: BingoCardInput = {
  teamName: "Les Hérissons",
  teamColor: "#6366f1",
  grid: { order: 2, title: "Autour du monde", size: 3, cells: CELLS, completedLines: ["row:0"] },
  total: 4,
  bonus: { line: 25, full: 100 },
};

const description = (input: BingoCardInput = CARD) => bingoCard(input).description!;

/** Une grille carrée de `size`, dont les `dones` premières cases sont validées. */
function bigGrid(size: number, prompt: string): BingoCardCell[] {
  const cells: BingoCardCell[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) cells.push(cell(`${String.fromCharCode(65 + c)}${r + 1}`, prompt));
  }
  return cells;
}

describe("carte bingo Discord", () => {
  it("ne connaît que les trois états du modèle", () => {
    expect(bingoCellState({ weight: 0, complete: false })).toBe("free");
    expect(bingoCellState({ weight: 0.5, complete: false })).toBe("half");
    expect(bingoCellState({ weight: 1, complete: true })).toBe("done");
    // Une case validée le reste, quel que soit le poids posé (un roman après deux ½).
    expect(bingoCellState({ weight: 2, complete: true })).toBe("done");
  });

  it("dessine la grille en émojis, une rangée par ligne", () => {
    const art = bingoArt(CELLS, 3);
    expect(art.split("\n")).toEqual([
      `${BINGO_MARK.done}${BINGO_MARK.done}${BINGO_MARK.done}`,
      `${BINGO_MARK.half}${BINGO_MARK.free}${BINGO_MARK.done}`,
      `${BINGO_MARK.free}${BINGO_MARK.free}${BINGO_MARK.free}`,
    ]);
    // Toutes les marques ont la même largeur : c'est ce qui aligne les colonnes.
    expect(new Set([BINGO_MARK.done, BINGO_MARK.half, BINGO_MARK.free]).size).toBe(3);
  });

  it("annonce la grille en cours, le compte des cases et les lignes complètes", () => {
    const text = description();
    expect(text).toContain("**Grille 2 sur 4**");
    expect(text).toContain(`«${NB}Autour du monde${NB}»`);
    expect(text).toContain("4/9 validées");
    expect(text).toContain("1 en attente ½");
    expect(text).toContain("4 libres");
    expect(text).toContain("1 ligne complète");
    expect(text).toContain(bingoArt(CELLS, 3));
  });

  it("dit où sont les colonnes et les lignes, faute de pouvoir les étiqueter sur le dessin", () => {
    expect(description()).toContain("Colonnes A→C");
    expect(description()).toContain("lignes 1→3");
    expect(description({ ...CARD, grid: { ...CARD.grid!, size: 5, cells: bigGrid(5, "Une consigne") } })).toContain("Colonnes A→E");
  });

  it("écrit « aucune ligne complète » plutôt qu'un zéro", () => {
    const text = description({ ...CARD, grid: { ...CARD.grid!, completedLines: [] } });
    expect(text).toContain("aucune ligne complète");
    expect(text).not.toContain("0 ligne");
  });

  it("liste les cases libres avec leur consigne — les catégories encore ouvertes", () => {
    const text = description();
    expect(text).toContain("Libres — 4 cases");
    expect(text).toContain("**B2** Un roman policier");
    expect(text).toContain("**A3** Un recueil de nouvelles");
    expect(text).toContain("**C3** Un classique");
  });

  it("nomme la moitié déjà posée sur une case en attente", () => {
    const text = description();
    expect(text).toContain("En attente ½ — 1 case");
    expect(text).toContain("**A2** Un livre traduit du japonais");
    expect(text).toContain(`½ «${NB}Kitchen${NB}» (Marie)`);
  });

  it("range les cases validées en une ligne d'étiquettes", () => {
    const text = description();
    expect(text).toContain("Validées — 4 cases");
    expect(text).toContain("A1 · B1 · C1 · C2");
  });

  it("met les cases actionnables avant les cases faites", () => {
    const text = description();
    expect(text.indexOf("En attente")).toBeLessThan(text.indexOf("Libres"));
    expect(text.indexOf("Libres")).toBeLessThan(text.indexOf("Validées"));
  });

  it("porte la couleur de l'équipe, son nom et le lien du site", () => {
    const card = bingoCard(CARD);
    expect(card.title).toContain("Les Hérissons");
    expect(card.color).toBe(0x6366f1);
    expect(card.url).toBe(`${APP_URL()}/bingo`);
    expect(card.footer?.text).toContain(`25${NB}pts`);
    expect(card.footer?.text).toContain(`100${NB}pts`);
    expect(bingoCard({ ...CARD, teamColor: null }).color).toBe(0);
  });

  it("sans grille en cours, dit laquelle des deux situations c'est", () => {
    const notReady = bingoCard({ ...CARD, grid: null, total: 0 });
    expect(notReady.description).toContain("pas encore prête");

    const finished = bingoCard({ ...CARD, grid: null, total: 4 });
    expect(finished.description).toContain("4 grilles sont terminées");

    const single = bingoCard({ ...CARD, grid: null, total: 1 });
    expect(single.description).toContain("Votre grille est terminée");
    expect(single.description).not.toContain("1 grilles");
  });

  it("tient dans un embed sur la plus grande grille possible (6×6) aux consignes bavardes", () => {
    const prompt = "Un livre dont la couverture est majoritairement bleue, trouvé en bibliothèque un jour de pluie, et lu d’une traite";
    const cells = bigGrid(6, prompt);
    const card = bingoCard({ ...CARD, grid: { order: 1, title: "La grande grille", size: 6, cells, completedLines: [] } });
    expect(card.description!.length).toBeLessThanOrEqual(4096);
    expect(card.description).toContain(bingoArt(cells, 6));
    expect(card.description).toContain("0/36 validées");
  });

  it("quand la liste déborde, écourte d'un nombre entier de cases et le dit", () => {
    const prompt = "Un livre dont la couverture est majoritairement bleue, trouvé en bibliothèque un jour de pluie";
    // Chaque case porte sa moitié : la légende dépasse largement l'embed.
    const cells = bigGrid(6, prompt).map((c) => ({ ...c, weight: 0.5, books: [GRAPHIQUE("Le Tigre bleu des montagnes", "Alycia")] }));
    const card = bingoCard({ ...CARD, grid: { order: 1, title: "La grande grille", size: 6, cells, completedLines: [] } });
    expect(card.description!.length).toBeLessThanOrEqual(4096);
    // Le dessin et le compte passent toujours ; c'est la liste qui cède.
    expect(card.description).toContain(bingoArt(cells, 6));
    expect(card.description).toContain("En attente ½ — 36 cases");
    expect(card.description).toMatch(/_… \d+ autres, à voir sur le site\._/u);
    // Jamais une case coupée en deux : chaque ligne listée est complète.
    for (const line of card.description!.split("\n")) {
      if (line.startsWith("•")) expect(line).toContain("(Alycia)");
    }
  });

  it("écourte un titre ou une consigne à rallonge plutôt que de manger la carte", () => {
    const cells = [cell("A1", "x".repeat(300), { weight: 0.5, books: [GRAPHIQUE("y".repeat(300), "Marie")] })];
    const card = bingoCard({ ...CARD, grid: { order: 1, title: "z".repeat(300), size: 1, cells, completedLines: [] } });
    expect(card.description!.length).toBeLessThanOrEqual(4096);
    expect(card.description).toContain("…");
    expect(card.description).not.toContain("x".repeat(100));
    expect(card.description).not.toContain("y".repeat(50));
    expect(card.description).not.toContain("z".repeat(100));
  });

  it("respecte la typographie française", () => {
    const strings = [
      bingoCard(CARD).title,
      bingoCard(CARD).description,
      bingoCard(CARD).footer?.text,
      bingoCard({ ...CARD, grid: null, total: 0 }).description,
      bingoCard({ ...CARD, grid: null, total: 4 }).description,
      bingoCard({ ...CARD, grid: { ...CARD.grid!, completedLines: [] } }).description,
    ].filter((s): s is string => typeof s === "string");
    // Apostrophe courbe partout, espace insécable avant une ponctuation double
    // et dans les guillemets — les mêmes contrôles que sur les cartes.
    for (const s of strings) {
      expect(s, s).not.toContain("'");
      expect(s, s).not.toMatch(/ [:;!?»]/u);
      expect(s, s).not.toMatch(/«(?! )/u);
      expect(s, s).not.toMatch(/(?<! )»/u);
    }
  });
});
