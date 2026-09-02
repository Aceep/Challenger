import { describe, expect, it } from "vitest";
import { GlobalFonts } from "@napi-rs/canvas";
import { GRID_FONT_FAMILY, registerGridFont } from "./fonts";
import { canvasMeasurer, renderGridPng } from "./grid-image";
import { layoutGrid, type GridView } from "./grid-layout";

const view = (theme = "Une couverture rouge"): GridView => ({
  size: 2,
  cells: [
    { label: "A1", theme, state: "done", note: "Léa" },
    { label: "B1", theme, state: "half", note: "½ Alycia" },
    { label: "A2", theme, state: "free" },
    { label: "B2", theme, state: "free" },
  ],
});

/** Les dimensions annoncées par l'en-tête IHDR d'un PNG. */
function pngSize(png: Buffer) {
  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("la police embarquée", () => {
  it("s'enregistre depuis le dépôt", () => {
    expect(registerGridFont()).toBe(true);
    expect(GlobalFonts.has(GRID_FONT_FAMILY)).toBe(true);
  });

  it("mesure un texte proportionnellement à sa longueur et à sa taille", () => {
    const measure = canvasMeasurer();
    expect(measure("Un huis clos", 15, 600)).toBeGreaterThan(measure("Un", 15, 600));
    expect(measure("Un huis clos", 45, 600)).toBeGreaterThan(measure("Un huis clos", 15, 600));
  });

  it("connaît les accents français — un « é » n'est pas le même dessin qu'un « e »", () => {
    // Sans police embarquée les deux tomberaient sur le même carré « tofu ».
    expect(renderGridPng(view("é"), { scale: 1 }).equals(renderGridPng(view("e"), { scale: 1 }))).toBe(false);
  });
});

describe("renderGridPng", () => {
  it("rend un PNG aux dimensions de la mise en pages", () => {
    const png = renderGridPng(view());
    const drawing = layoutGrid(view(), canvasMeasurer());
    expect(pngSize(png)).toEqual({ width: drawing.width, height: drawing.height });
  });

  it("dessine bien quelque chose — un thème différent donne une image différente", () => {
    expect(renderGridPng(view("Un huis clos"), { scale: 1 }).equals(renderGridPng(view("Un thriller"), { scale: 1 }))).toBe(false);
  });

  it("tient dans les limites d'une pièce jointe Discord (8 Mio)", () => {
    const full: GridView = { size: 4, cells: Array.from({ length: 16 }, (_, i) => ({ label: `case ${i}`, theme: "Un roman dont le thème est particulièrement long", state: "free" as const })) };
    expect(renderGridPng(full).byteLength).toBeLessThan(8 * 1024 * 1024);
  });
});
