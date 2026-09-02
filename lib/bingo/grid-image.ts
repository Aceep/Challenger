/**
 * Le dessin de la grille — un module volontairement mince.
 *
 * Toute la mise en pages (positions, couleurs, troncature, légende) vit dans
 * `grid-layout.ts`, qui ne connaît pas le canvas et se teste sans binaire
 * natif. Ici, on se contente d'exécuter la liste d'ordres qu'il produit, avec
 * la vraie mesure de texte de la police embarquée, et de rendre un PNG.
 */
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { fontSpec, registerGridFont } from "@/lib/bingo/fonts";
import { layoutGrid, type GridDrawing, type GridView, type MeasureText, type TextWeight } from "@/lib/bingo/grid-layout";

export { GRID_IMAGE_FILENAME } from "@/lib/bingo/image-name";

/**
 * Une mesure de texte réelle : un canvas de 1 px sert de règle. La mesure ne
 * dépend que de la police et de la taille demandées, jamais de la surface.
 */
export function canvasMeasurer(): MeasureText {
  registerGridFont();
  const ctx = createCanvas(1, 1).getContext("2d");
  return (text: string, size: number, weight: TextWeight) => {
    ctx.font = fontSpec(size, weight);
    return ctx.measureText(text).width;
  };
}

/** Exécute les ordres de dessin sur un contexte 2D. */
function paint(ctx: SKRSContext2D, drawing: GridDrawing) {
  ctx.fillStyle = drawing.background;
  ctx.fillRect(0, 0, drawing.width, drawing.height);
  ctx.textBaseline = "middle";
  for (const op of drawing.ops) {
    if (op.kind === "rect") {
      ctx.fillStyle = op.fill;
      ctx.beginPath();
      ctx.roundRect(op.x, op.y, op.w, op.h, op.r);
      ctx.fill();
      continue;
    }
    ctx.fillStyle = op.color;
    ctx.font = fontSpec(op.size, op.weight);
    ctx.textAlign = op.align;
    ctx.fillText(op.text, op.x, op.y);
  }
}

/**
 * La grille d'une équipe, en PNG. `scale` vaut 3 : Discord affiche l'image
 * réduite, et la finesse ne se voit qu'à ce prix.
 */
export function renderGridPng(view: GridView, options: { scale?: number } = {}): Buffer {
  const drawing = layoutGrid(view, canvasMeasurer(), options);
  const canvas = createCanvas(drawing.width, drawing.height);
  paint(canvas.getContext("2d"), drawing);
  return canvas.encodeSync("png");
}
