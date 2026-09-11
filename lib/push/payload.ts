import type { PushCategory } from "./categories";

/**
 * What travels inside a push message, and the one place its French is written.
 *
 * Pure: no I/O, no Prisma, no `next`. The service takes one of these objects and
 * ships it as JSON; `public/sw.js` reads the very same fields back. Keep the
 * shape flat and small — a push payload is capped around 4 KB, and iOS is the
 * strictest of the lot.
 *
 * `url` is always relative: the service worker resolves it against its own
 * origin, so the same payload works on localhost, on a preview and in prod.
 * `tag` collapses two notifications about the same thing into one line in the
 * shade — a second vote reminder replaces the first instead of stacking.
 */
export type PushPayload = {
  category: PushCategory;
  title: string;
  body: string;
  /** Relative path opened on click, e.g. `/story`. */
  url: string;
  /** Notifications sharing a tag replace one another. */
  tag?: string;
  /** Seconds the push service may hold the message. */
  ttl?: number;
};

/** A day: long enough to survive a night with the phone off, short enough to stay relevant. */
export const DEFAULT_TTL = 86_400;

/** A vote nobody answered is worth delivering for at least this long. */
const MIN_TTL = 60;

/** Espace fine insécable, exigée à l'intérieur des guillemets français. */
const NNBSP = " ";
/** Espace insécable, exigée avant « : », « ! » et « ? ». */
const NBSP = " ";

/** `« … »`, spaced the French way. */
function quote(text: string): string {
  return `«${NNBSP}${text}${NNBSP}»`;
}

/**
 * A one-line preview of a message body. Cuts on the last space before the
 * limit so a word is never sliced in half, and appends a real ellipsis.
 */
export function excerpt(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const voteTag = (voteId: string) => `vote:${voteId}`;
const questionTag = (questionId: string) => `question:${questionId}`;

/** A new chapter is on the table: the team has until `deadline` to vote. */
export function voteOpenedPayload(input: { voteId: string; chapterTitle: string; deadline: Date; now?: Date }): PushPayload {
  const now = input.now ?? new Date();
  const seconds = Math.floor((input.deadline.getTime() - now.getTime()) / 1000);
  return {
    category: "STORY",
    title: `Un vote est ouvert${NBSP}!`,
    body: `${quote(input.chapterTitle)} attend ta voix. Ouvre l’histoire pour choisir.`,
    url: "/story",
    tag: voteTag(input.voteId),
    // Past the deadline the message is noise: never hold it longer than the vote.
    ttl: Math.max(MIN_TTL, seconds),
  };
}

/** The vote is closed and the story moved on. */
export function voteResolvedPayload(input: { voteId: string; choiceLabel: string; nextChapterTitle: string | null }): PushPayload {
  return {
    category: "STORY",
    title: "Le chapitre est joué",
    body: input.nextChapterTitle
      ? `Ton équipe a choisi ${quote(input.choiceLabel)}. La suite${NBSP}: ${input.nextChapterTitle}.`
      : `Ton équipe a choisi ${quote(input.choiceLabel)}. L’histoire s’arrête là pour cette fois.`,
    url: "/story",
    tag: voteTag(input.voteId),
    ttl: DEFAULT_TTL,
  };
}

/** The choice is settled but it needs a rival team before it can be applied. */
export function awaitingTargetPayload(input: { voteId: string; choiceLabel: string }): PushPayload {
  return {
    category: "STORY",
    title: "Une équipe reste à désigner",
    body: `${quote(input.choiceLabel)} l’emporte${NBSP}: à toi de dire sur quelle équipe ça tombe.`,
    url: "/story",
    tag: voteTag(input.voteId),
    ttl: DEFAULT_TTL,
  };
}

/** Nobody won: the tie goes down the chain, captain then deputy then everyone. */
export function tieStagePayload(input: { voteId: string; stage: "CAPTAIN" | "DEPUTY" | "ANY" }): PushPayload {
  const body =
    input.stage === "CAPTAIN"
      ? `Le vote de ton équipe est à égalité${NBSP}: en tant que capitaine, c’est toi qui tranches.`
      : input.stage === "DEPUTY"
        ? `Le vote est toujours à égalité${NBSP}: en tant qu’adjoint·e, c’est à toi de trancher.`
        : `Le vote est toujours à égalité${NBSP}: n’importe qui dans l’équipe peut maintenant trancher.`;
  return {
    category: "STORY",
    title: "Égalité à départager",
    body,
    url: "/story",
    tag: voteTag(input.voteId),
    ttl: DEFAULT_TTL,
  };
}

/** A player broke a tie: an organiser has to confirm the choice. */
export function tiePendingPayload(input: { voteId: string; teamName: string; choiceLabel: string }): PushPayload {
  return {
    category: "ORGANIZER",
    title: "Un choix attend ta confirmation",
    body: `${input.teamName} propose ${quote(input.choiceLabel)} pour départager son vote.`,
    url: "/story",
    tag: voteTag(input.voteId),
    ttl: DEFAULT_TTL,
  };
}

/** Someone asked the organisation a question. */
export function questionAskedPayload(input: { questionId: string; title: string; authorName: string }): PushPayload {
  return {
    category: "ORGANIZER",
    title: "Nouvelle question",
    body: `${input.authorName} demande${NBSP}: ${excerpt(input.title)}`,
    url: `/faq/${input.questionId}`,
    tag: questionTag(input.questionId),
    ttl: DEFAULT_TTL,
  };
}

/** The organisation answered a question I asked. */
export function questionAnsweredPayload(input: { questionId: string; title: string; excerpt: string }): PushPayload {
  return {
    category: "QUESTIONS",
    title: "Réponse à ta question",
    body: `${excerpt(input.title, 60)} — ${excerpt(input.excerpt)}`,
    url: `/faq/${input.questionId}`,
    tag: questionTag(input.questionId),
    ttl: DEFAULT_TTL,
  };
}

/** A player added something to a question thread. */
export function playerRepliedPayload(input: { questionId: string; title: string; authorName: string }): PushPayload {
  return {
    category: "ORGANIZER",
    title: "Nouvelle réponse de joueur·euse",
    body: `${input.authorName} a répondu sur ${quote(excerpt(input.title, 60))}.`,
    url: `/faq/${input.questionId}`,
    tag: questionTag(input.questionId),
    ttl: DEFAULT_TTL,
  };
}

/** Another team's chapter landed on mine: points stolen, a modifier, a quest… */
export function effectsOnYouPayload(input: { voteId: string; teamName: string; summary: string }): PushPayload {
  return {
    category: "STORY",
    title: "Ton équipe est touchée",
    body: `${input.teamName} a joué son chapitre${NBSP}: ${excerpt(input.summary)}`,
    url: "/team",
    tag: voteTag(input.voteId),
    ttl: DEFAULT_TTL,
  };
}

/** The « Envoyer un test » button of Aide: proves the whole chain end to end. */
export function testPayload(): PushPayload {
  return {
    category: "STORY",
    title: "Test réussi",
    body: "Les notifications de Challenger arrivent bien sur cet appareil.",
    url: "/help#notifications",
    tag: "test",
    ttl: MIN_TTL,
  };
}
