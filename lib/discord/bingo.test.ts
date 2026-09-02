import { describe, expect, it } from "vitest";
import { GRID_IMAGE_FILENAME } from "@/lib/bingo/image-name";
import { bingoCard, bingoCellCard, bingoCellState, bingoGridView, cellNote, cellTodo, parseCellCoord, type BingoCardCell, type BingoCardInput } from "./bingo";
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

const ROMAN = (title: string, owner: string, at?: string) => ({ title, owner, type: "ROMAN" as const, at });
const GRAPHIQUE = (title: string, owner: string, at?: string) => ({ title, owner, type: "GRAPHIQUE" as const, at });

/** Une grille 3×3 : 4 cases validées (dont la première ligne), 1 en attente, 4 libres. */
const CELLS: BingoCardCell[] = [
  cell("A1", "Un livre d’avant 1900", { weight: 1, complete: true, books: [ROMAN("Le Horla", "Alycia", "2026-01-02")] }),
  cell("B1", "Une autrice africaine", { weight: 1, complete: true, books: [GRAPHIQUE("Aya de Yopougon", "Marie", "2026-01-03"), GRAPHIQUE("Muzungu", "Sam", "2026-01-04")] }),
  cell("C1", "Un titre en un seul mot", { weight: 1, complete: true, books: [ROMAN("Ravage", "Sam", "2026-01-01")] }),
  cell("A2", "Un livre traduit du japonais", { weight: 0.5, books: [GRAPHIQUE("Kitchen", "Marie", "2026-01-05")] }),
  cell("B2", "Un roman policier"),
  cell("C2", "Un livre de plus de 500 pages", { weight: 1, complete: true, books: [ROMAN("Les Misérables", "Alycia", "2026-01-06")] }),
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

const description = (input: BingoCardInput = CARD) => bingoCard(input).embed.description!;

/** Une grille carrée de `size`, toutes cases libres. */
function bigGrid(size: number, prompt: string): BingoCardCell[] {
  const cells: BingoCardCell[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) cells.push(cell(`${String.fromCharCode(65 + c)}${r + 1}`, prompt));
  }
  return cells;
}

describe("état d'une case", () => {
  it("ne connaît que les trois états du modèle", () => {
    expect(bingoCellState({ weight: 0, complete: false })).toBe("free");
    expect(bingoCellState({ weight: 0.5, complete: false })).toBe("half");
    expect(bingoCellState({ weight: 1, complete: true })).toBe("done");
  });

  it("écrit le pseudo sous le thème, avec le ½ des cases à moitié posées", () => {
    expect(cellNote(CELLS[0])).toBe("Alycia");
    expect(cellNote(CELLS[3])).toBe("½ Marie");
    expect(cellNote(CELLS[4])).toBeUndefined();
  });

  it("réunit les deux pseudos d'une case partagée, sans doublon", () => {
    expect(cellNote(CELLS[1])).toBe("Marie + Sam");
    expect(cellNote(cell("D1", "x", { weight: 1, complete: true, books: [GRAPHIQUE("a", "Marie"), GRAPHIQUE("b", "Marie")] }))).toBe("Marie");
  });
});

describe("la grille passée au dessin", () => {
  it("porte le thème, l'état et le pseudo de chaque case", () => {
    const view = bingoGridView(CARD.grid!);
    expect(view.size).toBe(3);
    expect(view.cells).toHaveLength(9);
    expect(view.cells[0]).toEqual({ label: "A1", theme: "Un livre d’avant 1900", state: "done", note: "Alycia" });
    expect(view.cells[3]).toEqual({ label: "A2", theme: "Un livre traduit du japonais", state: "half", note: "½ Marie" });
    expect(view.cells[4]).toEqual({ label: "B2", theme: "Un roman policier", state: "free", note: undefined });
  });

  it("ne tronque aucun thème : c'est la mise en pages qui décide", () => {
    const long = "z".repeat(300);
    expect(bingoGridView({ ...CARD.grid!, cells: [cell("A1", long)] }).cells[0].theme).toBe(long);
  });
});

describe("carte bingo Discord", () => {
  it("annonce la grille, son rang et le compte des cases", () => {
    const text = description();
    expect(text).toContain("**Grille 2 sur 4**");
    expect(text).toContain("4 validées");
    expect(text).toContain("1 en attente");
  });

  it("compte les lignes complètes, et le dit quand il n'y en a aucune", () => {
    expect(description()).toContain("1 ligne complète");
    expect(description({ ...CARD, grid: { ...CARD.grid!, completedLines: [] } })).toContain("aucune ligne complète");
    expect(description({ ...CARD, grid: { ...CARD.grid!, completedLines: ["row:0", "col:1"] } })).toContain("2 lignes complètes");
  });

  it("ne recopie plus la liste des thèmes : elle vit dans l'image", () => {
    const text = description();
    // Les cases libres et validées n'apparaissent pas en liste…
    expect(text).not.toContain("Un recueil de nouvelles");
    expect(text).not.toContain("Un livre offert");
    expect(text).not.toContain("Un classique");
    expect(text).not.toContain("Un titre en un seul mot");
    // … seule la case en attente et la dernière validation sont nommées.
    expect(text).toContain("Un livre traduit du japonais");
  });

  it("détaille chaque case en attente : qui a posé quoi, et ce qu'il manque", () => {
    const text = description();
    expect(text).toContain("**En attente — à compléter**");
    expect(text).toContain("**A2** Un livre traduit du japonais · ½ Marie — *Kitchen* · il manque 1 graphique");
  });

  it("nomme les dernières validations, la plus récente d'abord", () => {
    const text = description();
    expect(text).toContain("**Dernières validations**");
    expect(text).toContain(`**C2** Un livre de plus de 500${NB}pages · Alycia — *Les Misérables*`);
    // C2 (le 6) passe devant B1 (le 4) ; Ravage, posé le 1er, ne remonte pas.
    expect(text.indexOf("**C2**")).toBeLessThan(text.indexOf("**B1**"));
    expect(text).not.toContain("Ravage");
  });

  it("met le titre au singulier quand une seule case est validée", () => {
    const one = { ...CARD, grid: { ...CARD.grid!, cells: [CELLS[0], CELLS[4]] } };
    expect(description(one)).toContain("**Dernière validation**");
  });

  it("donne les deux pseudos et les deux titres d'une case partagée", () => {
    const shared = { ...CARD, grid: { ...CARD.grid!, cells: [CELLS[1]] } };
    expect(description(shared)).toContain("**B1** Une autrice africaine · Marie — *Aya de Yopougon* + Sam — *Muzungu*");
  });

  it("rappelle les deux commandes, avec une coordonnée qui existe", () => {
    const text = description();
    expect(text).toContain("`/bingo case:A2`");
    expect(text).toContain("`/ajouter-un-livre`");
  });

  it("tient sur un écran de téléphone, image mise à part", () => {
    const full = { ...CARD, grid: { ...CARD.grid!, size: 4, cells: bigGrid(4, "Un thème de case assez long pour peser").map((c, i) => (i < 8 ? { ...c, weight: 0.5, books: [GRAPHIQUE(`Titre ${i}`, "Marie")] } : c)) } };
    const text = description(full);
    expect(text.split("\n").length).toBeLessThanOrEqual(14);
    expect(text.length).toBeLessThan(1000);
    // Les cases en attente qui ne tiennent pas sont comptées, pas listées.
    expect(text).toContain("autres, sur l’image");
  });

  it("joint l'image et la désigne dans l'embed", () => {
    const card = bingoCard(CARD);
    expect(card.embed.image).toEqual({ url: `attachment://${GRID_IMAGE_FILENAME}` });
    expect(card.grid).not.toBeNull();
  });

  it("porte la couleur de l'équipe, le titre et le lien du site", () => {
    const card = bingoCard(CARD).embed;
    expect(card.title).toBe("Bingo — Les Hérissons");
    expect(card.color).toBe(0x6366f1);
    expect(card.url).toBe(`${APP_URL()}/bingo`);
    expect(bingoCard({ ...CARD, teamColor: null }).embed.color).toBe(0);
  });

  it("se passe d'image quand il n'y a pas de grille", () => {
    const notReady = bingoCard({ ...CARD, grid: null, total: 0 });
    expect(notReady.grid).toBeNull();
    expect(notReady.embed.image).toBeUndefined();
    expect(notReady.embed.description).toContain("pas encore prête");
    expect(bingoCard({ ...CARD, grid: null, total: 4 }).embed.description).toContain("Vos 4 grilles sont terminées");
    expect(bingoCard({ ...CARD, grid: null, total: 1 }).embed.description).toContain("Votre grille est terminée");
  });

  it("applique la typographie française à toute la copie", () => {
    const texts = [bingoCard(CARD).embed.title, description(), bingoCard(CARD).embed.footer?.text, bingoCard({ ...CARD, grid: null, total: 0 }).embed.description];
    for (const text of texts) expect(text ?? "").not.toMatch(/ [:;!?»]/);
  });
});

describe("parseCellCoord", () => {
  it("lit une coordonnée quelle que soit la casse ou les espaces", () => {
    for (const raw of ["a1", "A1", " a1 ", "A 1", "1a"]) expect(parseCellCoord(raw, 3)).toBe("A1");
  });

  it("refuse ce qui sort de la grille", () => {
    expect(parseCellCoord("D1", 3)).toBeNull();
    expect(parseCellCoord("A4", 3)).toBeNull();
    expect(parseCellCoord("A0", 3)).toBeNull();
    expect(parseCellCoord("", 3)).toBeNull();
    expect(parseCellCoord("bonjour", 3)).toBeNull();
    expect(parseCellCoord("11", 3)).toBeNull();
  });

  it("accepte tout le carré d'une grande grille", () => {
    expect(parseCellCoord("F6", 6)).toBe("F6");
    expect(parseCellCoord("G6", 6)).toBeNull();
  });
});

describe("détail d'une case", () => {
  it("dit ce qu'il reste à faire selon l'état", () => {
    expect(cellTodo(CELLS[0])).toContain("validée");
    expect(cellTodo(CELLS[3])).toContain("1 graphique");
    expect(cellTodo(CELLS[4])).toContain("2 graphiques");
  });

  it("écrit le thème en entier, sans le tronquer", () => {
    const long = "Un roman dont l’action se déroule intégralement dans un pays que l’autrice n’a jamais visité de sa vie";
    const card = bingoCellCard({ ...CARD, grid: { ...CARD.grid!, cells: [cell("A1", long)] } }, "A1");
    expect(card.description).toContain(long);
  });

  it("liste les lectures posées, avec leur type", () => {
    const card = bingoCellCard(CARD, "b1");
    expect(card.title).toBe("Bingo B1 — Les Hérissons");
    expect(card.description).toContain("Marie — *Aya de Yopougon* (graphique, ½)");
    expect(card.description).toContain("Sam — *Muzungu* (graphique, ½)");
    expect(card.description).toContain("Validée");
  });

  it("dit ce qu'il manque sur une case en attente", () => {
    const card = bingoCellCard(CARD, "A2");
    expect(card.description).toContain("En attente");
    expect(card.description).toContain("Marie — *Kitchen* (graphique, ½)");
    expect(card.description).toContain("1 graphique");
  });

  it("propose la commande d'ajout sur une case libre", () => {
    const card = bingoCellCard(CARD, "B2");
    expect(card.description).toContain("Libre");
    expect(card.description).toContain("Aucune lecture posée");
    expect(card.description).toContain("`/ajouter-un-livre`");
  });

  it("refuse clairement une coordonnée hors grille, en disant lesquelles existent", () => {
    const card = bingoCellCard(CARD, "Z9");
    expect(card.title).toBe("Case inconnue");
    expect(card.description).toContain("Z9");
    expect(card.description).toContain("**A1**");
    expect(card.description).toContain("**C3**");
  });

  it("répond sans grille en cours", () => {
    expect(bingoCellCard({ ...CARD, grid: null }, "A1").description).toContain("Aucune grille en cours");
  });

  it("rappelle de quelle grille il s'agit", () => {
    expect(bingoCellCard(CARD, "A1").footer?.text).toBe("Grille 2 sur 4 · Autour du monde");
  });

  it("applique la typographie française", () => {
    for (const raw of ["A1", "A2", "B2", "Z9"]) expect(bingoCellCard(CARD, raw).description ?? "").not.toMatch(/ [:;!?»]/);
  });
});
