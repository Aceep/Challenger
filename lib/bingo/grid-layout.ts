/**
 * La grille du bingo, mise en pages — et rien d'autre.
 *
 * Ce module ne connaît ni le canvas, ni Discord, ni la base : il transforme une
 * grille (cases, états, pseudos) en une liste d'ordres de dessin — des
 * rectangles arrondis et des textes, en pixels. Le dessin proprement dit vit
 * dans `lib/bingo/grid-image.ts` (canvas serveur) ; la page Équipe du site peut
 * relire la même liste pour peindre la même grille en SVG ou en HTML, sans
 * dupliquer une seule couleur ni une seule marge.
 *
 * Deux conséquences : tout est testable sans binaire natif (la mesure du texte
 * est un paramètre), et les deux surfaces ne peuvent pas diverger.
 *
 * Module pur (pas d'I/O, pas de `server-only`).
 */

/** Les trois états d'une case, tels que le modèle les connaît. */
export type BingoCellState = "done" | "half" | "free";

/** Une case, vue de la mise en pages : ce qui s'écrit, et de quelle couleur. */
export type GridCellView = {
  /** « B3 » : lettre de colonne + numéro de ligne. */
  label: string;
  /** La consigne de la case, écrite dans la case. */
  theme: string;
  state: BingoCellState;
  /** La ligne sous le thème : « Léa », « ½ Alycia », « Léa + Tom ». */
  note?: string;
};

export type GridView = {
  /** Côté de la grille : 4 pour une 4×4. */
  size: number;
  /** `size²` cases, en ordre ligne par ligne. */
  cells: GridCellView[];
};

export type TextWeight = 400 | 600;

/** Mesure la largeur d'un texte, en pixels, à la taille et à la graisse données. */
export type MeasureText = (text: string, size: number, weight: TextWeight) => number;

export type DrawOp =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r: number; fill: string }
  /** `y` est le **milieu** de la ligne : le dessin pose `textBaseline = "middle"`. */
  | { kind: "text"; x: number; y: number; text: string; size: number; weight: TextWeight; color: string; align: "center" | "left" };

export type GridDrawing = { width: number; height: number; scale: number; background: string; ops: DrawOp[] };

/**
 * La palette, sombre : l'image est lue dans Discord, dont le thème clair reste
 * minoritaire, et une image ne s'adapte pas au thème du lecteur. Les états se
 * distinguent d'abord par la couleur de fond, jamais par elle seule — le pseudo
 * et la légende disent la même chose en toutes lettres.
 */
export const GRID_THEME = {
  background: "#1e1f22",
  label: "#8a8f98",
  legend: "#8a8f98",
  cell: {
    free: { fill: "#3b3e45", text: "#d3d6db", note: "#a9aeb8" },
    half: { fill: "#e0a33e", text: "#2b1f00", note: "#5c4400" },
    done: { fill: "#57a866", text: "#0e2b17", note: "#1d4a2a" },
  },
} as const;

/** Les libellés de la légende, dans l'ordre où elle les aligne. */
export const STATE_LABEL: Record<BingoCellState, string> = { done: "validée", half: "en attente ½", free: "libre" };

/** Géométrie de base, en pixels « 1× ». `scale` multiplie tout à la fin. */
const GEO = {
  padding: 14,
  /** Colonne des numéros de ligne, à gauche. */
  rowLabel: 24,
  /** Rangée des lettres de colonne, en haut. */
  colLabel: 22,
  gap: 9,
  // Une case assez large pour qu'un mot comme « personnage » y tienne entier :
  // une césure au milieu d'un mot est ce qui abîme le plus la lecture.
  cell: { w: 124, h: 110, radius: 12, padding: 10 },
  theme: { size: 13, weight: 600 as TextWeight, lineHeight: 16, maxLines: 4 },
  note: { size: 12, weight: 400 as TextWeight, lineHeight: 15, gap: 4 },
  axis: { size: 14, weight: 600 as TextWeight },
  legend: { size: 12, weight: 400 as TextWeight, height: 26, chip: 11, chipGap: 6, itemGap: 16, radius: 3 },
} as const;

const ELLIPSIS = "…";

/**
 * Découpe un texte en lignes qui tiennent dans `maxWidth`, au plus `maxLines`.
 * Ce qui dépasse est écourté par « … » — jamais coupé net au milieu d'un mot
 * quand un mot entier peut être retiré. Un mot plus large que la case est,
 * lui, tranché lettre à lettre : mieux vaut « Autobiogra… » qu'un débordement.
 */
export function wrapText(text: string, maxWidth: number, measure: MeasureText, size: number, weight: TextWeight, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const fits = (s: string) => measure(s, size, weight) <= maxWidth;

  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    // Un mot seul trop large : on le coupe, morceau par morceau.
    if (!fits(word)) {
      let rest = word;
      while (rest && !fits(rest)) {
        let cut = rest.length - 1;
        while (cut > 1 && !fits(rest.slice(0, cut))) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
        if (lines.length >= maxLines) break;
      }
      line = rest;
    } else {
      line = word;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  if (lines.length <= maxLines && lines.join(" ") === words.join(" ")) return lines;

  // Il reste du texte : la dernière ligne gardée finit par « … ».
  const kept = lines.slice(0, maxLines);
  const last = kept.length - 1;
  if (last < 0) return kept;
  let tail = kept[last];
  while (tail && !fits(`${tail}${ELLIPSIS}`)) tail = tail.slice(0, -1).trimEnd();
  kept[last] = `${tail}${ELLIPSIS}`;
  return kept;
}

/** « A », « B »… puis « AA » — une grille n'ira jamais si loin, mais rien ne casse. */
export function columnLetter(col: number): string {
  let n = col;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/**
 * Met la grille en pages : cases, lettres de colonnes, numéros de lignes, et la
 * légende qui nomme les trois états — pour que l'image se lise seule, sortie du
 * message qui l'accompagne.
 */
export function layoutGrid(view: GridView, measure: MeasureText, options: { scale?: number } = {}): GridDrawing {
  const scale = options.scale ?? 3;
  const size = Math.max(1, view.size);
  const { padding, rowLabel, colLabel, gap, cell, theme, note, axis, legend } = GEO;

  const gridWidth = size * cell.w + (size - 1) * gap;
  // La marge droite reprend la largeur de la colonne des numéros : sans cela,
  // la grille paraît poussée contre le bord droit.
  const width = 2 * (padding + rowLabel) + gridWidth;
  const height = padding + colLabel + size * cell.h + (size - 1) * gap + legend.height + padding;
  const left = padding + rowLabel;
  const top = padding + colLabel;

  const ops: DrawOp[] = [];
  const cellX = (col: number) => left + col * (cell.w + gap);
  const cellY = (row: number) => top + row * (cell.h + gap);

  // Les lettres de colonnes, centrées au-dessus de chaque colonne.
  for (let col = 0; col < size; col++) {
    ops.push({ kind: "text", x: cellX(col) + cell.w / 2, y: padding + colLabel / 2, text: columnLetter(col), size: axis.size, weight: axis.weight, color: GRID_THEME.label, align: "center" });
  }
  // Les numéros de lignes, centrés à gauche de chaque rangée.
  for (let row = 0; row < size; row++) {
    ops.push({ kind: "text", x: padding + rowLabel / 2, y: cellY(row) + cell.h / 2, text: String(row + 1), size: axis.size, weight: axis.weight, color: GRID_THEME.label, align: "center" });
  }

  const inner = cell.w - 2 * cell.padding;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const c = view.cells[row * size + col];
      const x = cellX(col);
      const y = cellY(row);
      const colors = GRID_THEME.cell[c?.state ?? "free"];
      ops.push({ kind: "rect", x, y, w: cell.w, h: cell.h, r: cell.radius, fill: colors.fill });
      if (!c) continue;

      const lines = wrapText(c.theme, inner, measure, theme.size, theme.weight, theme.maxLines);
      const noteLines = c.note ? wrapText(c.note, inner, measure, note.size, note.weight, 1) : [];
      const blockHeight = lines.length * theme.lineHeight + (noteLines.length ? note.gap + note.lineHeight : 0);
      let cursor = y + (cell.h - blockHeight) / 2;
      const centre = x + cell.w / 2;
      for (const line of lines) {
        ops.push({ kind: "text", x: centre, y: cursor + theme.lineHeight / 2, text: line, size: theme.size, weight: theme.weight, color: colors.text, align: "center" });
        cursor += theme.lineHeight;
      }
      if (noteLines.length) {
        cursor += note.gap;
        ops.push({ kind: "text", x: centre, y: cursor + note.lineHeight / 2, text: noteLines[0], size: note.size, weight: note.weight, color: colors.note, align: "center" });
      }
    }
  }

  // La légende : une pastille par état, alignées sous la grille.
  const legendY = top + size * cell.h + (size - 1) * gap + legend.height / 2;
  let cursorX = left;
  for (const state of ["done", "half", "free"] as const) {
    const label = STATE_LABEL[state];
    ops.push({ kind: "rect", x: cursorX, y: legendY - legend.chip / 2, w: legend.chip, h: legend.chip, r: legend.radius, fill: GRID_THEME.cell[state].fill });
    ops.push({ kind: "text", x: cursorX + legend.chip + legend.chipGap, y: legendY, text: label, size: legend.size, weight: legend.weight, color: GRID_THEME.legend, align: "left" });
    cursorX += legend.chip + legend.chipGap + measure(label, legend.size, legend.weight) + legend.itemGap;
  }

  const scaled: DrawOp[] = ops.map((op) =>
    op.kind === "rect"
      ? { ...op, x: op.x * scale, y: op.y * scale, w: op.w * scale, h: op.h * scale, r: op.r * scale }
      : { ...op, x: op.x * scale, y: op.y * scale, size: op.size * scale },
  );

  return { width: Math.round(width * scale), height: Math.round(height * scale), scale, background: GRID_THEME.background, ops: scaled };
}
