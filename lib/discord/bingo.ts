/**
 * La carte Discord du bingo d'équipe — la réponse de `/bingo`.
 *
 * Discord ne sait pas dessiner un tableau : la grille est donc peinte en
 * émojis (une ligne de texte par rangée, toutes les marques ont la même
 * largeur, l'alignement tient sur mobile comme sur ordinateur), et la légende
 * qui suit dit ce que chaque case attend. Trois états, ceux du modèle :
 * validée, en attente ½ (une moitié posée, il manque l'autre) et libre.
 *
 * Module pur (pas d'I/O, pas de `server-only`) : toute la copie est ici, donc
 * testée. La typographie française passe par `fr()` — jamais d'espace fine
 * tapée à la main.
 */
import { fr, type DiscordEmbed } from "@/lib/discord/cards";
import { APP_URL } from "@/lib/discord/help";
import { hexToInt } from "@/lib/discord/permissions";

/** Limite d'une description d'embed Discord. */
const EMBED_LIMIT = 4096;

/** Les trois états d'une case, tels que le modèle les connaît. */
export type BingoCellState = "done" | "half" | "free";

export const BINGO_MARK: Record<BingoCellState, string> = { done: "🟩", half: "🟨", free: "⬜" };

export type BingoCardCell = {
  /** « B3 » : lettre de colonne + numéro de ligne (`cellLabel`). */
  label: string;
  prompt: string;
  /** Poids déjà posé sur la case : roman 1, graphique ½. */
  weight: number;
  complete: boolean;
  books: { title: string; owner: string; type: "ROMAN" | "GRAPHIQUE" }[];
};

export type BingoCardInput = {
  teamName: string;
  teamColor: string | null;
  /**
   * La grille **en cours** de l'équipe, cases en ordre ligne par ligne.
   * `null` quand la série n'a pas commencé, ou que l'équipe l'a terminée.
   */
  grid: { order: number; title: string; size: number; cells: BingoCardCell[]; completedLines: string[] } | null;
  /** Nombre de grilles de la série. */
  total: number;
  bonus: { line: number; full: number };
};

/** L'état d'une case : une seule règle, partagée par la grille et la légende. */
export function bingoCellState(c: { weight: number; complete: boolean }): BingoCellState {
  return c.complete ? "done" : c.weight > 0 ? "half" : "free";
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** La grille peinte : une rangée par ligne de texte, dans l'ordre des cases. */
export function bingoArt(cells: BingoCardCell[], size: number): string {
  const rows: string[] = [];
  for (let r = 0; r < size; r++) {
    const row = cells.slice(r * size, (r + 1) * size);
    if (row.length) rows.push(row.map((c) => BINGO_MARK[bingoCellState(c)]).join(""));
  }
  return rows.join("\n");
}

/** « • **B3** Un roman policier — ½ « Kitchen » (Marie) » */
function cellLine(c: BingoCardCell): string {
  const books = c.books.map((b) => `${b.type === "GRAPHIQUE" ? "½ " : ""}« ${clip(b.title, 40)} » (${b.owner})`).join(", ");
  return `• **${c.label}** ${clip(c.prompt, 90)}${books ? ` — ${books}` : ""}`;
}

type Block = { title: string; lines: string[] };

/**
 * Assemble l'en-tête et les listes dans la limite de l'embed. Une liste trop
 * longue est écourtée d'un nombre entier de cases — jamais coupée au milieu
 * d'un mot — et le dit.
 */
function assemble(head: string, blocks: Block[], limit = EMBED_LIMIT): string {
  let out = head;
  for (const block of blocks) {
    if (!block.lines.length) continue;
    let text = `\n\n${block.title}`;
    let shown = 0;
    for (const line of block.lines) {
      const rest = block.lines.length - shown - 1;
      const note = rest > 0 ? `\n${more(rest)}` : "";
      if (out.length + text.length + line.length + 1 + note.length > limit) break;
      text += `\n${line}`;
      shown++;
    }
    // Un bloc dont pas une seule case ne tient est laissé de côté entièrement.
    if (shown === 0) continue;
    if (shown < block.lines.length) text += `\n${more(block.lines.length - shown)}`;
    out += text;
  }
  return out;
}

const more = (n: number) => `_… ${plural(n, "autre")}, à voir sur le site._`;

/**
 * La grille en cours de l'équipe : le dessin, le compte, puis les cases qui
 * attendent quelque chose — les libres en premier lieu, c'est la question que
 * l'on se pose la manche à la main.
 */
export function bingoCard(input: BingoCardInput): DiscordEmbed {
  const color = hexToInt(input.teamColor);
  const url = `${APP_URL()}/bingo`;
  const title = `🎯 Bingo — ${input.teamName}`;

  if (!input.grid) {
    return {
      title: fr(title),
      description: fr(
        input.total === 0
          ? "La première grille n’est pas encore prête : les organisateur·ices la publieront bientôt."
          : input.total > 1
            ? `Vos ${input.total} grilles sont terminées — il ne reste plus une case à cocher. Bravo !`
            : "Votre grille est terminée — il ne reste plus une case à cocher. Bravo !",
      ),
      color,
      url,
    };
  }

  const { cells, size, order } = input.grid;
  const done = cells.filter((c) => bingoCellState(c) === "done");
  const half = cells.filter((c) => bingoCellState(c) === "half");
  const free = cells.filter((c) => bingoCellState(c) === "free");
  const lines = input.grid.completedLines.length;
  const lastColumn = String.fromCharCode(64 + size);

  const head = [
    `**Grille ${order} sur ${input.total}** · « ${clip(input.grid.title, 80)} »`,
    "",
    bingoArt(cells, size),
    "",
    `${BINGO_MARK.done} ${done.length}/${cells.length} validées · ${BINGO_MARK.half} ${half.length} en attente ½ · ${BINGO_MARK.free} ${free.length} libres · ${
      lines > 0 ? `${plural(lines, "ligne")} complète${lines > 1 ? "s" : ""}` : "aucune ligne complète"
    }`,
    `_Colonnes A→${lastColumn} de gauche à droite, lignes 1→${size} de haut en bas._`,
    "Pose une lecture avec l’option *case* de `/ajouter-un-livre`.",
  ].join("\n");

  const blocks: Block[] = [
    { title: `**${BINGO_MARK.half} En attente ½ — ${plural(half.length, "case")}**`, lines: half.map(cellLine) },
    { title: `**${BINGO_MARK.free} Libres — ${plural(free.length, "case")}**`, lines: free.map(cellLine) },
    { title: `**${BINGO_MARK.done} Validées — ${plural(done.length, "case")}**`, lines: done.length ? [done.map((c) => c.label).join(" · ")] : [] },
  ];

  return {
    title: fr(title),
    description: fr(assemble(head, blocks)).slice(0, EMBED_LIMIT),
    color,
    footer: {
      text: fr(`Un roman valide une case, deux graphiques aussi · ligne complète : ${input.bonus.line} pts · grille entière : ${input.bonus.full} pts`),
    },
    url,
  };
}
