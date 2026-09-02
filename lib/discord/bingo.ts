/**
 * La carte Discord du bingo d'équipe — les réponses de `/bingo`.
 *
 * La grille n'est plus peinte en émojis ni recopiée case par case sous forme de
 * liste : elle est dessinée côté serveur et jointe en PNG
 * (`lib/bingo/grid-image.ts`). Le texte ne garde donc que ce sur quoi on peut
 * agir — les cases en attente, la ou les dernières validations, et les deux
 * commandes qui suivent — pour tenir sur un écran de téléphone.
 *
 * Module pur (pas d'I/O, pas de canvas, pas de `server-only`) : toute la copie
 * est ici, donc testée. La typographie française passe par `fr()` — jamais
 * d'espace fine tapée à la main.
 */
import type { GridCellView, GridView } from "@/lib/bingo/grid-layout";
import { GRID_IMAGE_FILENAME } from "@/lib/bingo/image-name";
import { fr, type DiscordEmbed } from "@/lib/discord/cards";
import { APP_URL } from "@/lib/discord/help";
import { hexToInt } from "@/lib/discord/permissions";

/** Limite d'une description d'embed Discord. */
const EMBED_LIMIT = 4096;

/** Les trois états d'une case, tels que le modèle les connaît. */
export type BingoCellState = "done" | "half" | "free";

export type BingoCardBook = {
  title: string;
  owner: string;
  type: "ROMAN" | "GRAPHIQUE";
  /** Date de pose, pour trier les dernières validations. */
  at?: Date | string | number | null;
};

export type BingoCardCell = {
  /** « B3 » : lettre de colonne + numéro de ligne (`cellLabel`). */
  label: string;
  prompt: string;
  /** Poids déjà posé sur la case : roman 1, graphique ½. */
  weight: number;
  complete: boolean;
  books: BingoCardBook[];
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

/** L'embed, et la grille à dessiner — `null` quand il n'y a rien à joindre. */
export type BingoCard = { embed: DiscordEmbed; grid: GridView | null };

/** L'état d'une case : une seule règle, partagée par l'image et le texte. */
export function bingoCellState(c: { weight: number; complete: boolean }): BingoCellState {
  return c.complete ? "done" : c.weight > 0 ? "half" : "free";
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const plural = (n: number, word: string, suffix = "s") => `${n} ${word}${n > 1 ? suffix : ""}`;

const time = (at: BingoCardBook["at"]) => (at ? new Date(at).getTime() || 0 : 0);

/** Les pseudos qui ont posé quelque chose sur la case, sans doublon. */
const owners = (c: BingoCardCell) => [...new Set(c.books.map((b) => b.owner))];

/**
 * Ce qui s'écrit sous le thème, dans la case : le pseudo qui l'a validée, ou
 * « ½ pseudo » quand un seul graphique est posé.
 */
export function cellNote(c: BingoCardCell): string | undefined {
  const state = bingoCellState(c);
  if (state === "free" || !c.books.length) return undefined;
  const names = owners(c).join(" + ");
  return state === "half" ? `½ ${names}` : names;
}

/** La grille telle que le dessin l'attend — le seul pont vers `lib/bingo`. */
export function bingoGridView(grid: NonNullable<BingoCardInput["grid"]>): GridView {
  const cells: GridCellView[] = grid.cells.map((c) => ({ label: c.label, theme: c.prompt, state: bingoCellState(c), note: cellNote(c) }));
  return { size: grid.size, cells };
}

/** « Léa — *Dix petits nègres* », ou les deux moitiés d'une case partagée. */
function contributions(c: BingoCardCell): string {
  return c.books.map((b) => `${b.owner} — *${clip(b.title, 40)}*`).join(" + ");
}

/** « D1 Un accident de la route · ½ Alycia — *Le pavillon d'or* · il manque 1 graphique » */
function pendingLine(c: BingoCardCell): string {
  const posed = c.books.map((b) => `½ ${b.owner} — *${clip(b.title, 40)}*`).join(" + ");
  return `**${c.label}** ${clip(c.prompt, 60)} · ${posed} · il manque 1 graphique`;
}

/** « A2 Un huis clos · Léa — *Dix petits nègres* » */
function doneLine(c: BingoCardCell): string {
  return `**${c.label}** ${clip(c.prompt, 60)} · ${contributions(c)}`;
}

/** La coordonnée proposée en exemple : une case qui attend, sinon une libre. */
function sampleLabel(cells: BingoCardCell[]): string {
  const byState = (s: BingoCellState) => cells.find((c) => bingoCellState(c) === s);
  return (byState("half") ?? byState("free") ?? cells[0])?.label ?? "A1";
}

const hints = (label: string) => `_Détail d’une case :_ \`/bingo case:${label}\` · _Poser une lecture :_ \`/ajouter-un-livre\``;

/** Le message des grilles absentes ou toutes terminées. */
function emptyCard(input: BingoCardInput, color: number, url: string, title: string): BingoCard {
  return {
    embed: {
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
    },
    grid: null,
  };
}

/**
 * La grille en cours de l'équipe : le récapitulatif, l'image, puis les seules
 * lignes sur lesquelles on peut agir. Tout le reste — la liste des seize
 * thèmes, en particulier — vit désormais dans l'image.
 */
export function bingoCard(input: BingoCardInput): BingoCard {
  const color = hexToInt(input.teamColor);
  const url = `${APP_URL()}/bingo`;
  const title = `Bingo — ${input.teamName}`;
  if (!input.grid) return emptyCard(input, color, url, title);

  const { cells, order } = input.grid;
  const done = cells.filter((c) => bingoCellState(c) === "done");
  const half = cells.filter((c) => bingoCellState(c) === "half");
  const lines = input.grid.completedLines.length;

  const summary = [
    `**Grille ${order} sur ${input.total}**`,
    `${done.length} validée${done.length > 1 ? "s" : ""}`,
    `${half.length} en attente`,
    lines > 0 ? `${plural(lines, "ligne")} complète${lines > 1 ? "s" : ""}` : "aucune ligne complète",
  ].join(" · ");

  // Les dernières d'abord : c'est la nouvelle qu'on vient chercher.
  const latest = [...done].sort((a, b) => Math.max(...b.books.map((k) => time(k.at)), 0) - Math.max(...a.books.map((k) => time(k.at)), 0)).slice(0, 2);
  const shown = half.slice(0, 4);

  const parts = [summary];
  if (half.length) {
    parts.push("", `**En attente — à compléter**`, ...shown.map(pendingLine));
    if (half.length > shown.length) parts.push(`_… ${plural(half.length - shown.length, "autre")}, sur l’image._`);
  }
  if (latest.length) parts.push("", `**Dernière${latest.length > 1 ? "s" : ""} validation${latest.length > 1 ? "s" : ""}**`, ...latest.map(doneLine));
  parts.push("", hints(sampleLabel(cells)));

  return {
    embed: {
      title: fr(title),
      description: fr(parts.join("\n")).slice(0, EMBED_LIMIT),
      color,
      image: { url: `attachment://${GRID_IMAGE_FILENAME}` },
      footer: { text: fr(`Un roman valide une case, deux graphiques aussi · ligne : ${input.bonus.line} pts · grille : ${input.bonus.full} pts`) },
      url,
    },
    grid: bingoGridView(input.grid),
  };
}

// ---------------------------------------------------------------------------
// `/bingo case:D1` — le détail d'une case
// ---------------------------------------------------------------------------

/**
 * Lit une coordonnée tapée à la main : « d1 », « D1 », « 1D » ou « D 1 ».
 * Rend le libellé canonique, ou `null` si la case n'existe pas sur la grille.
 */
export function parseCellCoord(raw: string, size: number): string | null {
  const clean = raw.trim().toUpperCase().replace(/\s+/g, "");
  const direct = /^([A-Z])(\d{1,2})$/.exec(clean);
  const reversed = /^(\d{1,2})([A-Z])$/.exec(clean);
  const letter = direct?.[1] ?? reversed?.[2];
  const digits = direct?.[2] ?? reversed?.[1];
  if (!letter || !digits) return null;
  const col = letter.charCodeAt(0) - 65;
  const row = Number(digits) - 1;
  if (!Number.isInteger(row) || col < 0 || col >= size || row < 0 || row >= size) return null;
  return `${letter}${row + 1}`;
}

/** Ce qu'il reste à faire sur une case, dit en une phrase. */
export function cellTodo(c: BingoCardCell): string {
  const state = bingoCellState(c);
  if (state === "done") return "Rien : la case est validée.";
  if (state === "half") return "Il manque **1 graphique** pour la valider — un second graphique complète la moitié déjà posée.";
  return "Il faut **1 roman**, ou **2 graphiques**.";
}

const STATE_TEXT: Record<BingoCellState, string> = { done: "✅ Validée", half: "🟨 En attente ½", free: "⬜ Libre" };

/**
 * Le détail d'une case : le thème en entier — jamais tronqué, c'est la raison
 * d'être de la commande —, l'état, ce qui a été posé et ce qu'il manque.
 */
export function bingoCellCard(input: BingoCardInput, raw: string): DiscordEmbed {
  const color = hexToInt(input.teamColor);
  const url = `${APP_URL()}/bingo`;
  if (!input.grid) {
    return { title: fr(`Bingo — ${input.teamName}`), description: fr("Aucune grille en cours : il n’y a pas de case à détailler."), color, url };
  }
  const label = parseCellCoord(raw, input.grid.size);
  const cell = label ? input.grid.cells.find((c) => c.label === label) : undefined;
  if (!cell) {
    const last = String.fromCharCode(64 + input.grid.size);
    return {
      title: fr("Case inconnue"),
      description: fr(`« ${raw.trim() || "—"} » n’est pas une case de cette grille. Les coordonnées vont de **A1** à **${last}${input.grid.size}** : par exemple \`/bingo case:${sampleLabel(input.grid.cells)}\`.`),
      color,
      url,
    };
  }

  const state = bingoCellState(cell);
  const posed = cell.books.length
    ? cell.books.map((b) => `• ${b.owner} — *${b.title}* (${b.type === "GRAPHIQUE" ? "graphique, ½" : "roman"})`).join("\n")
    : "_Aucune lecture posée pour l’instant._";

  return {
    title: fr(`Bingo ${cell.label} — ${input.teamName}`),
    description: fr(
      [
        `**${cell.prompt}**`,
        "",
        `**État** : ${STATE_TEXT[state]}`,
        "",
        "**Lectures posées**",
        posed,
        "",
        `**À faire** : ${cellTodo(cell)}`,
        state === "done" ? "" : `_Pose une lecture avec l’option *case* de_ \`/ajouter-un-livre\`.`,
      ]
        .filter((l, i, all) => !(l === "" && all[i - 1] === ""))
        .join("\n"),
    ).slice(0, EMBED_LIMIT),
    color,
    footer: { text: fr(`Grille ${input.grid.order} sur ${input.total} · ${input.grid.title}`) },
    url,
  };
}
