import { GameError } from "@/lib/errors";
import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fmtDelta } from "@/lib/format";
import { isAllowedCoverUrl } from "@/lib/books/openlibrary";
import { assertWritable, canEditBook, editDeadline, inActorEdition, type ActorRole } from "@/lib/scoring/books";
import { effectiveType, readingPoints, type BookType } from "@/lib/scoring/reading";
import { attachBookToCell, detachBookFromCell, resettleCell, snapshotCellPositions, type CellAttachResult } from "@/lib/services/bingo";
import { awardPoints, num } from "@/lib/services/points";
import { attachBookToQuest, detachBookFromQuest, resyncBookQuest, type QuestAttachResult } from "@/lib/services/quests";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const optionalId = z.string().optional().transform((s) => s || null);

/** Cover of the OpenLibrary autocomplete; anything else is dropped by `safeCover`. */
const optionalCover = z.string().trim().max(500).optional().transform((s) => s || null);

/** A cover is stored only when it comes from covers.openlibrary.org — the form is not to be trusted. */
const safeCover = (url: string | null | undefined) => (isAllowedCoverUrl(url) ? url : null);

export const bookSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(200),
  author: z.string().trim().min(1, "Auteur·ice requis·e").max(120),
  pages: z.coerce.number().int("Nombre entier").min(1, "Au moins 1 page").max(5000),
  /** Declared type. Under 150 pages the reading is a graphique whatever is declared. */
  type: z.enum(["ROMAN", "GRAPHIQUE"]).default("ROMAN"),
  /** Cover URL filled by the web autocomplete; absent from the Discord flow. */
  coverUrl: optionalCover,
  finishedAt: z.coerce.date().optional(),
  /** Quest to attach the reading to. */
  questId: optionalId,
  /** Team bingo cell to place the reading on. */
  cellId: optionalId,
});
export type BookInput = z.infer<typeof bookSchema>;

/** Partial edit: only provided fields change; `questId`/`cellId` = "" detaches, undefined keeps. */
export const bookPatchSchema = bookSchema.partial();
export type BookPatch = z.infer<typeof bookPatchSchema>;

/** Who is writing, in which challenge. `challengeId` is null when they belong to none. */
export type BookActor = {
  id: string;
  role: ActorRole;
  challengeId: string | null;
  teamId: string | null;
  isCaptain: boolean;
  /** Platform owner: organiser of every edition, so no edition boundary. */
  isSuperAdmin?: boolean;
};

/**
 * Readings of one edition: those credited to a team of it, plus the ones
 * attached to no team, which belong to no edition. Someone in no edition only
 * ever sees the latter.
 */
const ofEdition = (challengeId: string | null) => (challengeId ? { OR: [{ team: { challengeId } }, { teamId: null }] } : { teamId: null });

export type BookResult = {
  book: { id: string; title: string; pages: number; type: BookType; points: number };
  /** Reading points credited by this operation (delta). */
  points: number;
  quest: QuestAttachResult | null;
  cell: CellAttachResult | null;
};

async function playerTeam(tx: Tx, userId: string, challengeId: string | null) {
  if (!challengeId) return null;
  return tx.teamMember.findUnique({ where: { userId_challengeId: { userId, challengeId } }, include: { team: { include: { challenge: true } } } });
}

async function creditReading(tx: Tx, book: { id: string; title: string; points: { toString(): string } | number }, userId: string, teamId: string) {
  const ev = await awardPoints(tx, { teamId, userId, source: "READING", baseAmount: num(book.points), label: `Lecture : ${book.title}`, bookId: book.id });
  return ev?.amount ?? 0;
}

async function reverseReading(tx: Tx, bookId: string, title: string, actorId: string) {
  const events = await tx.pointEvent.findMany({ where: { bookId, source: "READING" } });
  const net = events.reduce((n, e) => n + num(e.amount), 0);
  const base = events.reduce((n, e) => n + num(e.baseAmount), 0);
  if (net === 0) return 0;
  await awardPoints(tx, { teamId: events[0].teamId, userId: actorId, source: "READING", baseAmount: -base, rawAmount: -net, label: `Annulation : ${title}`, bookId, refId: `book:${bookId}:undo` });
  return -net;
}

/** Logs a finished reading, credits the (frozen) team, optionally attaches it to a quest and a cell. */
export async function logBook(actor: BookActor, input: BookInput): Promise<BookResult> {
  assertWritable(actor.role);
  return prisma.$transaction(async (tx) => {
    const membership = await playerTeam(tx, actor.id, actor.challengeId);
    if (membership && membership.team.challenge.endAt < new Date()) throw new GameError("Le défi est terminé");
    if ((input.questId || input.cellId) && !membership) throw new GameError("Rejoins une équipe pour valider une quête ou une case");

    const type = effectiveType(input.pages, input.type === "GRAPHIQUE");
    const book = await tx.book.create({
      data: {
        userId: actor.id,
        teamId: membership?.teamId ?? null,
        title: input.title,
        author: input.author,
        pages: input.pages,
        isGraphic: input.type === "GRAPHIQUE",
        type,
        coverUrl: safeCover(input.coverUrl),
        points: readingPoints(input.pages, membership?.team.challenge.pointsPerPage),
        finishedAt: input.finishedAt ?? new Date(),
        updatedById: actor.id,
      },
    });
    const points = membership ? await creditReading(tx, book, actor.id, membership.teamId) : 0;
    const quest = input.questId && membership ? await attachBookToQuest(tx, book, membership.teamId, input.questId, actor.id) : null;
    const cell = input.cellId && membership ? await attachBookToCell(tx, book, membership.teamId, input.cellId, actor.id) : null;
    return { book: { ...book, points: num(book.points) }, points, quest, cell };
  });
}

async function loadEditable(tx: Tx, bookId: string, actor: BookActor) {
  const book = await tx.book.findUnique({ where: { id: bookId, deletedAt: null }, include: { team: { include: { challenge: true } } } });
  // A reading of another edition simply does not exist from here — organising one
  // edition grants nothing on its neighbour.
  if (!book || !inActorEdition(book, actor)) throw new GameError("Lecture introuvable");
  const isCaptainOfOwner = !!book.team && book.team.captainId === actor.id;
  if (!canEditBook(book, { id: actor.id, role: actor.role, isCaptainOfOwner, challengeId: actor.challengeId, isSuperAdmin: actor.isSuperAdmin })) {
    throw new GameError(
      book.userId === actor.id
        ? `Modification possible pendant 1 h après l'ajout (jusqu'à ${editDeadline(book).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}) ; ensuite, demande à ton·ta capitaine.`
        : "Seul·e le·la capitaine peut modifier cette lecture",
    );
  }
  return { book, ownerTeam: book.team };
}

/** Edits a reading (fields and/or links). Re-credits points when pages change. */
export async function updateBook(actor: BookActor, bookId: string, patch: BookPatch): Promise<BookResult> {
  assertWritable(actor.role);
  return prisma.$transaction(async (tx) => {
    const { book, ownerTeam } = await loadEditable(tx, bookId, actor);
    if (ownerTeam && ownerTeam.challenge.endAt < new Date()) throw new GameError("Le défi est terminé");

    const pages = patch.pages ?? book.pages;
    const declaredGraphic = patch.type !== undefined ? patch.type === "GRAPHIQUE" : book.isGraphic;
    const type = effectiveType(pages, declaredGraphic);
    const newPoints = pages !== book.pages ? readingPoints(pages, ownerTeam?.challenge.pointsPerPage) : num(book.points);

    const cellBefore = await snapshotCellPositions(tx, bookId);
    const updated = await tx.book.update({
      where: { id: bookId },
      data: {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.author !== undefined && { author: patch.author }),
        ...(patch.coverUrl !== undefined && { coverUrl: safeCover(patch.coverUrl) }),
        pages,
        isGraphic: declaredGraphic,
        type,
        points: newPoints,
        ...(patch.finishedAt !== undefined && { finishedAt: patch.finishedAt }),
        updatedById: actor.id,
      },
    });

    let points = 0;
    if (pages !== book.pages && ownerTeam) {
      await reverseReading(tx, bookId, book.title, actor.id);
      points = await creditReading(tx, updated, book.userId, ownerTeam.id);
    }

    let quest: BookResult["quest"] = null;
    let cell: BookResult["cell"] = null;
    if (ownerTeam) {
      const weightChanged = type !== book.type;
      if (patch.questId !== undefined) {
        if (patch.questId) quest = await attachBookToQuest(tx, updated, ownerTeam.id, patch.questId, actor.id);
        else await detachBookFromQuest(tx, bookId, actor.id);
      } else if (weightChanged) {
        await resyncBookQuest(tx, bookId, actor.id);
      }
      if (patch.cellId !== undefined) {
        if (patch.cellId) cell = await attachBookToCell(tx, updated, ownerTeam.id, patch.cellId, actor.id);
        else await detachBookFromCell(tx, bookId, actor.id);
      } else if (weightChanged) {
        await resettleCell(tx, bookId, actor.id, cellBefore);
      }
    }
    return { book: { ...updated, points: num(updated.points) }, points, quest, cell };
  });
}

/** Soft-deletes a reading: detaches it from quest/cell (they drop back to "en attente") and reverses its points. */
export async function deleteBook(actor: BookActor, bookId: string) {
  assertWritable(actor.role);
  return prisma.$transaction(async (tx) => {
    const { book } = await loadEditable(tx, bookId, actor);
    await detachBookFromQuest(tx, bookId, actor.id);
    await detachBookFromCell(tx, bookId, actor.id);
    await reverseReading(tx, bookId, book.title, actor.id);
    await tx.book.update({ where: { id: bookId }, data: { deletedAt: new Date(), updatedById: actor.id } });
  });
}

const bookInclude = {
  questBook: { include: { quest: { select: { number: true, title: true } } } },
  bingoFill: { include: { cell: { select: { row: true, col: true } } } },
  user: { select: { name: true } },
  team: { select: { id: true, captainId: true, challengeId: true } },
} as const;

function decorate<T extends { userId: string; createdAt: Date; points: { toString(): string }; team: { captainId: string | null; challengeId: string } | null }>(b: T, actor: BookActor) {
  return {
    ...b,
    points: num(b.points),
    editable: canEditBook(b, {
      id: actor.id,
      role: actor.role,
      isCaptainOfOwner: b.team?.captainId === actor.id,
      challengeId: actor.challengeId,
      isSuperAdmin: actor.isSuperAdmin,
    }),
    editUntil: editDeadline(b),
  };
}

/** A player's readings **of the edition being played**, with points, links and edit permission for `actor`. */
export async function listBooks(userId: string, actor: BookActor) {
  const books = await prisma.book.findMany({
    where: { userId, deletedAt: null, ...ofEdition(actor.challengeId) },
    orderBy: { finishedAt: "desc" },
    include: bookInclude,
  });
  return books.map((b) => decorate(b, actor));
}

/** Readings of every teammate except `exceptUserId` (captain view). */
export async function listTeamBooks(teamId: string, exceptUserId: string, actor: BookActor) {
  const books = await prisma.book.findMany({ where: { teamId, deletedAt: null, userId: { not: exceptUserId } }, orderBy: { finishedAt: "desc" }, include: bookInclude });
  return books.map((b) => decorate(b, actor));
}

/** One reading, seen from an edition: a reading of another one is « introuvable ». */
export async function getBook(bookId: string, scope: { challengeId: string | null; isSuperAdmin?: boolean }) {
  const b = await prisma.book.findFirst({
    where: { id: bookId, deletedAt: null, ...(scope.isSuperAdmin ? {} : ofEdition(scope.challengeId)) },
    include: {
      questBook: { select: { questId: true, quest: { select: { number: true, title: true } } } },
      bingoFill: { select: { cellId: true, cell: { select: { row: true, col: true, prompt: true } } } },
      user: { select: { id: true, name: true } },
      team: { select: { id: true, captainId: true, challengeId: true } },
    },
  });
  return b && { ...b, points: num(b.points) };
}

/** One-line French recap of what a reading changed (web flash message and Discord reply). */
export function describeResult(r: BookResult, withPoints = true) {
  const parts: string[] = [];
  if (withPoints && r.points) parts.push(`${fmtDelta(r.points)} pts`);
  const freed = (f: { title: string; owner: string } | null) => (f ? ` — le ½ de « ${f.title} » (${f.owner}) revient en attente` : "");
  if (r.quest) parts.push(`quête #${r.quest.number} ${r.quest.complete ? `validée ✅${r.quest.points ? ` (+${r.quest.points} pts)` : ""}` : "en attente (½)"}${freed(r.quest.freed)}`);
  if (r.cell) {
    parts.push(`case ${r.cell.label} ${r.cell.complete ? "validée ✅" : "en attente (½)"}${r.cell.gained.length ? " — ligne de bingo ! 🎉" : ""}${freed(r.cell.freed)}`);
    if (r.cell.grid?.completed) parts.push(r.cell.grid.next ? `grille terminée 🏆 — la grille ${r.cell.grid.next.order} « ${r.cell.grid.next.title} » s'ouvre` : "grille terminée 🏆 — c'était la dernière !");
  }
  return parts.join(" · ");
}
