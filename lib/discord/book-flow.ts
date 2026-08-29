import "server-only";
import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { after } from "next/server";
import {
  CANCEL_BUTTON_LABEL,
  NONE_LABEL,
  SELECT_PLACEHOLDER,
  VALIDATE_BUTTON_LABEL,
  pickerPrompt,
  readingConfirmation,
} from "@/lib/discord/cards";
import {
  BOOK_MODAL_ID,
  MODAL_FIELD,
  TEXT_STYLE,
  bookId,
  modalPayload,
  toComponents,
  toOptions,
  type ComponentRow,
  type SelectOption,
} from "@/lib/discord/components";
import { announceGridChange, announceRankChange, announceReading } from "@/lib/discord/events";
import { readPendingChoices, type PendingField } from "@/lib/discord/pending";
import { assertWritable } from "@/lib/scoring/books";
import { cellChoices, questChoices } from "@/lib/services/autocomplete";
import { bookSchema, describeResult, logBook, type BookActor } from "@/lib/services/books";
import { withLeaderWatch } from "@/lib/services/leaderboard";
import {
  claimPendingReading,
  consumePendingReading,
  createPendingReading,
  loadPendingReading,
  setPendingChoice,
  type PendingReading,
} from "@/lib/services/pending-reading";

/**
 * The « J'ai fini un livre » flow: button → modal → dropdowns → « Valider ».
 *
 * Four handlers returning plain interaction-response bodies, so `route.ts`
 * stays a dispatcher. Two rules hold everything together:
 * - **no Discord REST before answering** — the 3-second budget is spent on the
 *   database only, every post goes through `after()`;
 * - **the row is the truth** — the ephemeral is rebuilt from `PendingReading`
 *   at each step, with `default: true` on what was already chosen (D3).
 *
 * Every handler re-checks the salon, the owner and the expiry: the route did
 * it once, but a `custom_id` is a string anyone can echo back.
 */

export type InteractionReply = { type: number; data?: unknown };

export type FlowCtx = {
  actor: BookActor;
  user: { id: string; name: string | null };
  username: string;
  challenge: { id: string };
  team: { id: string } | null;
  channelId: string | null;
  inTeamChannel: boolean;
  libraryChannel: string | null;
};

/** Espace insécable, exigé par la typographie française. */
const NBSP = "\u00a0";

const NO_TEAM = "Rejoins une équipe d’abord.";
const PAGES_INVALID = `Nombre de pages invalide${NBSP}: indique un entier entre 1 et 5000.`;
const CANCELLED = `Fiche abandonnée. Reclique sur «${NBSP}J’ai fini un livre${NBSP}» quand tu veux.`;
const invalid = (message: string | undefined) => `Paramètres invalides${NBSP}: ${message ?? "recommence."}`;

const ephemeralReply = (content: string): InteractionReply => ({
  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  data: { content, flags: InteractionResponseFlags.EPHEMERAL },
});

const wrongPlace = (ctx: FlowCtx): InteractionReply =>
  ephemeralReply(
    ctx.libraryChannel
      ? `Ce bouton ne marche que dans la librairie de ton équipe (<#${ctx.libraryChannel}>).`
      : "Ton équipe n’a pas encore de salon librairie configuré.",
  );

/** The salon check, re-done by every handler; `null` when the click is legitimate. */
function offSide(ctx: FlowCtx): InteractionReply | null {
  return ctx.inTeamChannel && ctx.channelId ? null : wrongPlace(ctx);
}

const TYPE_OPTIONS: SelectOption[] = [
  { label: "Roman", value: "ROMAN", description: "Valide une quête ou une case à lui seul." },
  { label: "Graphique", value: "GRAPHIQUE", description: `BD, manga, ou moins de 150${NBSP}p. Vaut ½, il en faut deux.` },
];

/**
 * The ephemeral, rebuilt from the row: text plus every component. A type-7
 * payload that omits a select **erases** it, so all the rows are always sent.
 * A select with zero options is refused by Discord, so an empty menu is dropped
 * and the text says so (D8).
 */
function renderPicker(p: PendingReading) {
  const choices = readPendingChoices(p.options);
  const rows: ComponentRow[] = [
    {
      select: {
        customId: bookId("type", p.id),
        placeholder: SELECT_PLACEHOLDER.type,
        minValues: 1,
        options: TYPE_OPTIONS.map((o) => ({ ...o, default: o.value === p.type })),
      },
    },
  ];
  if (choices.quests.length) {
    rows.push({
      select: { customId: bookId("quest", p.id), placeholder: SELECT_PLACEHOLDER.quest, options: toOptions(choices.quests, p.questId, NONE_LABEL) },
    });
  }
  if (choices.cells.length) {
    rows.push({
      select: { customId: bookId("cell", p.id), placeholder: SELECT_PLACEHOLDER.cell, options: toOptions(choices.cells, p.cellId, NONE_LABEL) },
    });
  }
  rows.push({
    buttons: [
      { customId: bookId("save", p.id), label: VALIDATE_BUTTON_LABEL, style: 3 },
      { customId: bookId("cancel", p.id), label: CANCEL_BUTTON_LABEL, style: 2 },
    ],
  });
  return {
    content: pickerPrompt({ title: p.title, pages: p.pages }, { quests: choices.quests.length > 0, cells: choices.cells.length > 0 }),
    components: toComponents(rows),
  };
}

/**
 * Button « J'ai fini un livre » → a modal. No I/O at all: Discord forbids
 * DEFERRED → MODAL, so the whole 3-second budget must fit in this function.
 */
export async function openBookModal(ctx: FlowCtx): Promise<InteractionReply> {
  // Refused right away during the Sunday window, rather than after three fields typed.
  assertWritable(ctx.actor.role);
  if (!ctx.team) return ephemeralReply(NO_TEAM);
  return {
    type: InteractionResponseType.MODAL,
    data: modalPayload({
      customId: BOOK_MODAL_ID,
      title: "Une lecture de plus",
      inputs: [
        { customId: MODAL_FIELD.title, label: "Titre", style: TEXT_STYLE.SHORT, required: true, maxLength: 200 },
        { customId: MODAL_FIELD.author, label: "Auteur·ice", style: TEXT_STYLE.SHORT, required: true, maxLength: 120 },
        { customId: MODAL_FIELD.pages, label: "Nombre de pages", style: TEXT_STYLE.SHORT, required: true, maxLength: 4, placeholder: "312" },
      ],
    }),
  };
}

/**
 * MODAL_SUBMIT → validate the three fields with a slice of `bookSchema` (no
 * duplicated rule), freeze both menus, create the row, and answer the ephemeral
 * carrying the selects and Valider/Annuler.
 */
export async function submitBookModal(ctx: FlowCtx, values: Record<string, string>): Promise<InteractionReply> {
  const off = offSide(ctx);
  if (off) return off;
  if (!ctx.team || !ctx.channelId) return ephemeralReply(NO_TEAM);

  const head = bookSchema
    .pick({ title: true, author: true, pages: true })
    .safeParse({ title: values[MODAL_FIELD.title], author: values[MODAL_FIELD.author], pages: values[MODAL_FIELD.pages] });
  if (!head.success) {
    // A text input is always a string: a typo on the page count is the common case, so it gets its own sentence.
    const onPages = head.error.issues.some((i) => i.path[0] === "pages");
    return ephemeralReply(onPages ? PAGES_INVALID : invalid(head.error.issues[0]?.message));
  }

  // Both menus in parallel and unfiltered (already capped at 25), then one insert: the 3-s budget.
  const [quests, cells] = await Promise.all([questChoices(ctx.challenge.id, ctx.team.id, ""), cellChoices(ctx.team.id, "")]);
  const pending = await createPendingReading({
    userId: ctx.user.id,
    challengeId: ctx.challenge.id,
    teamId: ctx.team.id,
    channelId: ctx.channelId,
    title: head.data.title,
    author: head.data.author,
    pages: head.data.pages,
    choices: { quests, cells },
  });

  const view = renderPicker(pending);
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: view.content, flags: InteractionResponseFlags.EPHEMERAL, components: view.components },
  };
}

/** A select changed → persist it, re-render the same ephemeral (UPDATE_MESSAGE). */
export async function chooseBookOption(ctx: FlowCtx, field: PendingField, pendingId: string, value: string): Promise<InteractionReply> {
  const off = offSide(ctx);
  if (off) return off;
  const updated = await setPendingChoice(pendingId, ctx.user.id, ctx.channelId, field, value);
  const view = renderPicker(updated);
  return { type: InteractionResponseType.UPDATE_MESSAGE, data: { content: view.content, components: view.components } };
}

/**
 * « Valider » → the same service path as `/ajouter-un-livre`. An expired or
 * foreign row throws a `GameError`, which the route renders as a fresh type-4
 * ephemeral — the old message can no longer be edited anyway.
 */
export async function saveBookPending(ctx: FlowCtx, pendingId: string): Promise<InteractionReply> {
  const off = offSide(ctx);
  if (off) return off;
  // Claimed, not just read: the delete is what serialises a double « Valider »,
  // so a second click finds nothing and says « expirée » instead of saving twice.
  const pending = await claimPendingReading(pendingId, ctx.user.id, ctx.channelId);
  const parsed = bookSchema.safeParse({
    title: pending.title,
    author: pending.author,
    pages: pending.pages,
    type: pending.type,
    // "" is what the schema transforms back into null.
    questId: pending.questId ?? "",
    cellId: pending.cellId ?? "",
  });
  if (!parsed.success) return ephemeralReply(invalid(parsed.error.issues[0]?.message));

  const { result, before, after: top } = await withLeaderWatch(ctx.challenge.id, () => logBook(ctx.actor, parsed.data));

  const detail = describeResult(result, false);
  const teamId = ctx.team?.id;
  if (teamId) after(() => announceRankChange(ctx.challenge.id, before, top));
  if (teamId && result.cell?.grid) after(() => announceGridChange(teamId, result.cell!.grid!));
  if (teamId) after(() => announceReading(result.book.id, { kind: "new", points: result.points, detail }));

  // Components emptied: the dropdowns cannot be clicked on a reading already saved.
  return {
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: { content: readingConfirmation({ title: result.book.title, points: result.points, detail, kind: "new" }), components: [] },
  };
}

/** « Annuler » → drop the row (after the ownership check), blank the ephemeral. */
export async function cancelBookPending(ctx: FlowCtx, pendingId: string): Promise<InteractionReply> {
  const off = offSide(ctx);
  if (off) return off;
  await loadPendingReading(pendingId, ctx.user.id, ctx.channelId);
  await consumePendingReading(pendingId);
  return { type: InteractionResponseType.UPDATE_MESSAGE, data: { content: CANCELLED, components: [] } };
}
