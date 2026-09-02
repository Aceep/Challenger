import { describe, expect, it } from "vitest";
import { columnLetter, GRID_THEME, layoutGrid, STATE_LABEL, wrapText, type GridCellView, type GridView, type MeasureText } from "./grid-layout";

/** Une police fictive à chasse fixe : 0,55 em par caractère. Déterministe, donc testable. */
const measure: MeasureText = (text, size) => text.length * size * 0.55;

const cell = (over: Partial<GridCellView> = {}): GridCellView => ({ label: "A1", theme: "Une couverture rouge", state: "free", ...over });

const view = (over: Partial<GridView> = {}): GridView => ({
  size: 2,
  cells: [cell({ label: "A1", state: "done", note: "Léa" }), cell({ label: "B1", state: "half", note: "½ Alycia" }), cell({ label: "A2" }), cell({ label: "B2" })],
  ...over,
});

const texts = (v: GridView = view()) => layoutGrid(v, measure).ops.flatMap((op) => (op.kind === "text" ? [op] : []));
const rects = (v: GridView = view()) => layoutGrid(v, measure).ops.flatMap((op) => (op.kind === "rect" ? [op] : []));

describe("wrapText", () => {
  it("garde un texte court sur une ligne", () => {
    expect(wrapText("Un huis clos", 200, measure, 15, 600, 3)).toEqual(["Un huis clos"]);
  });

  it("passe à la ligne aux espaces, jamais au milieu d'un mot qui tient", () => {
    const lines = wrapText("Un personnage qui traverse la France", 90, measure, 15, 600, 3);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(measure(line, 15, 600)).toBeLessThanOrEqual(90);
    expect(lines.join(" ")).toContain("personnage");
  });

  it("écourte par « … » ce qui dépasse le nombre de lignes", () => {
    const lines = wrapText("Un roman dont l'action se déroule intégralement dans un pays que l'autrice n'a jamais visité", 90, measure, 15, 600, 3);
    expect(lines).toHaveLength(3);
    expect(lines[2].endsWith("…")).toBe(true);
    for (const line of lines) expect(measure(line, 15, 600)).toBeLessThanOrEqual(90);
  });

  it("tranche un mot seul plus large que la case, sans déborder", () => {
    const lines = wrapText("Autobiographieromanesquissime", 60, measure, 15, 600, 2);
    expect(lines.length).toBeLessThanOrEqual(2);
    for (const line of lines) expect(measure(line, 15, 600)).toBeLessThanOrEqual(60);
    expect(lines[lines.length - 1].endsWith("…")).toBe(true);
  });

  it("ne rend rien pour un thème vide", () => {
    expect(wrapText("   ", 100, measure, 15, 600, 3)).toEqual([]);
  });
});

describe("columnLetter", () => {
  it("numérote les colonnes A, B, C…", () => {
    expect([0, 1, 3, 25].map(columnLetter)).toEqual(["A", "B", "D", "Z"]);
  });

  it("ne casse pas au-delà de Z", () => {
    expect(columnLetter(26)).toBe("AA");
  });
});

describe("layoutGrid", () => {
  it("dessine un rectangle par case, plus les trois pastilles de la légende", () => {
    expect(rects()).toHaveLength(2 * 2 + 3);
  });

  it("écrit les lettres de colonnes et les numéros de lignes", () => {
    const written = texts().map((t) => t.text);
    expect(written).toContain("A");
    expect(written).toContain("B");
    expect(written).toContain("1");
    expect(written).toContain("2");
  });

  it("écrit le thème dans chaque case", () => {
    const written = texts({ ...view(), cells: view().cells.map((c, i) => ({ ...c, theme: `thème ${i}` })) }).map((t) => t.text);
    for (let i = 0; i < 4; i++) expect(written).toContain(`thème ${i}`);
  });

  it("écrit le pseudo sous le thème, dans la même case", () => {
    const written = texts().map((t) => t.text);
    expect(written).toContain("Léa");
    expect(written).toContain("½ Alycia");
  });

  it("nomme les trois états dans la légende — l'image se lit sans le message", () => {
    const written = texts().map((t) => t.text);
    for (const label of Object.values(STATE_LABEL)) expect(written).toContain(label);
  });

  it("donne une couleur de fond distincte à chacun des trois états", () => {
    const fills = new Set([GRID_THEME.cell.done.fill, GRID_THEME.cell.half.fill, GRID_THEME.cell.free.fill]);
    expect(fills.size).toBe(3);
    const drawn = rects().map((r) => r.fill);
    for (const fill of fills) expect(drawn).toContain(fill);
  });

  it("garde tous les ordres de dessin dans le cadre", () => {
    const drawing = layoutGrid(view({ size: 4, cells: Array.from({ length: 16 }, (_, i) => cell({ label: `C${i}`, theme: "Un roman très long comme thème de case", note: "½ Alycia" })) }), measure);
    for (const op of drawing.ops) {
      expect(op.x).toBeGreaterThanOrEqual(0);
      expect(op.y).toBeGreaterThanOrEqual(0);
      expect(op.kind === "rect" ? op.x + op.w : op.x).toBeLessThanOrEqual(drawing.width);
      expect(op.kind === "rect" ? op.y + op.h : op.y).toBeLessThanOrEqual(drawing.height);
    }
  });

  it("grandit avec la grille", () => {
    const small = layoutGrid(view({ size: 3, cells: Array.from({ length: 9 }, () => cell()) }), measure);
    const big = layoutGrid(view({ size: 5, cells: Array.from({ length: 25 }, () => cell()) }), measure);
    expect(big.width).toBeGreaterThan(small.width);
    expect(big.height).toBeGreaterThan(small.height);
  });

  it("met tout à l'échelle demandée — 3× par défaut, pour la netteté", () => {
    const one = layoutGrid(view(), measure, { scale: 1 });
    const three = layoutGrid(view(), measure);
    expect(three.scale).toBe(3);
    expect(three.width).toBe(one.width * 3);
    expect(three.height).toBe(one.height * 3);
    const [firstOne] = one.ops.flatMap((op) => (op.kind === "text" ? [op] : []));
    const [firstThree] = three.ops.flatMap((op) => (op.kind === "text" ? [op] : []));
    expect(firstThree.size).toBe(firstOne.size * 3);
  });

  it("ne tombe pas sur une grille incomplète", () => {
    const drawing = layoutGrid({ size: 2, cells: [cell()] }, measure);
    expect(drawing.ops.length).toBeGreaterThan(0);
  });
});
