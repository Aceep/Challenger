/**
 * Discord cards: the pinned guide of a *librairie* salon, the public card of a
 * reading, and the ephemeral strings of the « J'ai fini un livre » flow.
 *
 * Pure module (no I/O, no `server-only`): all the copy of the flow lives here
 * so it is unit-tested. French typography is applied by `fr()` — never type a
 * narrow space by hand, write a plain one and let the helper harden it.
 */
import { isAllowedCoverUrl } from "@/lib/books/openlibrary";
import { BOOK_TYPE_LABEL, fmtDelta } from "@/lib/format";
import { APP_URL } from "@/lib/discord/help";
import { hexToInt } from "@/lib/discord/permissions";

export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  author?: { name: string };
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  thumbnail?: { url: string };
  /** Grande image sous l'embed — `attachment://fichier.png` pour une pièce jointe. */
  image?: { url: string };
  url?: string;
};

export const GUIDE_BUTTON_LABEL = "J’ai fini un livre";
export const VALIDATE_BUTTON_LABEL = "Valider";
export const CANCEL_BUTTON_LABEL = "Annuler";
export const NONE_LABEL = "— aucune —";

export const SELECT_PLACEHOLDER = {
  type: "Type de lecture",
  quest: "Quête validée (facultatif)",
  cell: "Case du bingo (facultative)",
} as const;

/** Discord's embed description limit. */
const EMBED_LIMIT = 4096;

const NBSP = "\u00a0";

/**
 * Espace insécable (U+00A0) là où le français l'exige : avant `: ; ! ?`,
 * dans les guillemets « … », et entre un nombre et son unité (150 p., 19 h,
 * 7,5 pts). Appliqué à toute la copie produite ici.
 */
export function fr(s: string): string {
  return s
    .replace(/ ([:;!?»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/(\d) (pts?\b|pages?\b|p\.|h\b|min\b)/g, `$1${NBSP}$2`);
}

// ---------------------------------------------------------------------------
// La carte épinglée de la librairie
// ---------------------------------------------------------------------------

export type GuideTeam = {
  name: string;
  color: string;
  discordChannelId: string | null;
  discordLibraryChannelId: string | null;
};

/** The pinned card of a librairie salon: 3 rules, the app, the commands. */
export function guideCard(team: GuideTeam): DiscordEmbed {
  const description = fr(
    [
      "C’est ici qu’on déclare ses lectures terminées. Trois règles, et c’est tout :",
      "• **1 page = 0,1 pt** — sous 150 pages, c’est moitié moins (149 p. → 7,5 pts).",
      "• Un **roman** valide une quête ou une case ; un **graphique** (BD, manga, ou toute lecture < 150 p.) vaut ½ : il en faut deux.",
      "• Chaque **dimanche de 19 h à 21 h**, tout est gelé — c’est la vérification. Le classement tombe à 20 h.",
      "",
      "👇 **Le bouton ci-dessous fait tout** : titre, auteur, pages, puis le type, la quête et la case.",
      "",
      "Et en commandes, si tu préfères taper :",
      "• **/ajouter-un-livre** — la même chose en une ligne",
      "• **/modifier-un-livre** — corriger ou supprimer (1 h après l’ajout, puis le·la capitaine)",
      "• **/quete** — les quêtes ouvertes de l’équipe",
      "• **/bingo** — la grille en cours en image, et `/bingo case:D1` pour une case",
      "• **/score** — le classement",
      "• **/help** — toutes les règles",
      "",
      `🌐 Tout est aussi sur le site : ${APP_URL()}`,
    ].join("\n"),
  );
  return {
    title: fr(`📚 La librairie ${team.name}`),
    description: description.slice(0, EMBED_LIMIT),
    color: hexToInt(team.color),
    footer: { text: fr("Kyle veille — et il est intraitable sur les ½ crédits.") },
    url: `${APP_URL()}/books`,
  };
}

// ---------------------------------------------------------------------------
// La carte publique d'une lecture
// ---------------------------------------------------------------------------

export type ReadingCardInput = {
  reader: string;
  teamName: string | null;
  teamColor: string | null;
  title: string;
  author: string;
  pages: number;
  type: "ROMAN" | "GRAPHIQUE";
  points: number;
  /** `describeResult(r, false)` */
  detail: string;
  kind: "new" | "update";
  /** `Book.coverUrl`; anything but a covers.openlibrary.org URL is ignored. */
  coverUrl?: string | null;
};

/** The public card posted in the librairie for every reading, whatever the surface. */
export function readingCard(r: ReadingCardInput): DiscordEmbed {
  const lines = [
    `*${r.author}* · ${r.pages} p. · ${BOOK_TYPE_LABEL[r.type]}`,
    // L'équipe est nommée même sans point à annoncer : la carte peut atterrir
    // dans le salon général, que toutes les équipes se partagent.
    r.teamName ? (r.points !== 0 ? `**${fmtDelta(r.points)} pts** pour ${r.teamName}` : `Équipe ${r.teamName}`) : "",
    r.detail.trim(),
  ].filter(Boolean);
  return {
    author: { name: fr(`${r.reader} ${r.kind === "new" ? "a terminé un livre" : "a corrigé une lecture"}`) },
    title: fr(`📚 ${r.title}`),
    description: fr(lines.join("\n")).slice(0, EMBED_LIMIT),
    color: hexToInt(r.teamColor),
    ...(isAllowedCoverUrl(r.coverUrl) ? { thumbnail: { url: r.coverUrl } } : {}),
    ...(r.kind === "new" ? { footer: { text: fr("Une coquille ? /modifier-un-livre, ou le site — pendant 1 h.") } } : {}),
    url: `${APP_URL()}/books`,
  };
}

/** Les salons qu'une lecture peut atteindre, du plus précis au plus large. */
export type ReadingChannels = {
  /** Le salon *librairie* de l'équipe : la place naturelle de la carte. */
  library: string | null | undefined;
  /** Son salon *aventure*, tant que la librairie n'existe pas. */
  adventure: string | null | undefined;
  /** Le salon général de l'édition — celui de cette édition, jamais d'une autre. */
  general: string | null | undefined;
};

/**
 * Le salon où publier la carte d'une lecture.
 *
 * Une équipe sans salon à elle n'est pas une raison de se taire : la carte
 * retombe sur le salon général de son édition, pour qu'un livre inscrit sur le
 * site apparaisse toujours quelque part sur le Discord du défi. Rien n'est
 * publié — silencieusement — quand l'édition n'a aucun salon configuré.
 */
export function readingChannel(c: ReadingChannels): string | null {
  return c.library || c.adventure || c.general || null;
}

// ---------------------------------------------------------------------------
// Les textes éphémères du parcours
// ---------------------------------------------------------------------------

/** Ephemeral one-liner shown to the reader (Discord) — mirrors the web flash. */
export function readingConfirmation(r: { title: string; points: number; detail: string; kind: "new" | "update" }): string {
  const detail = r.detail.trim();
  const parts =
    r.kind === "new"
      ? [`✅ Lecture enregistrée — **${r.title}**`, r.points !== 0 ? `${fmtDelta(r.points)} pts` : "", detail]
      : [`✏️ Lecture modifiée — **${r.title}**`, detail];
  return fr(parts.filter(Boolean).join(" · "));
}

/** Ephemeral text above the three dropdowns. */
export function pickerPrompt(b: { title: string; pages: number }, has: { quests: boolean; cells: boolean }): string {
  const lines = [
    `📕 **${b.title}** — ${b.pages} p. Dernière étape : le type, et si ça compte, une quête et une case. Puis **Valider**.`,
    has.quests ? "" : "_Aucune quête ouverte pour l’instant._",
    has.cells ? "" : "_Aucune case libre sur la grille en cours._",
  ].filter(Boolean);
  return fr(lines.join("\n"));
}
