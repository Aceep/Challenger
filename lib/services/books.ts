import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canEditBook, editDeadline } from "@/lib/scoring/books";
import { readingPoints } from "@/lib/scoring/reading";
import { attachBookToCell, detachBookFromCell, resettleCell, snapshotCellPositions } from "@/lib/services/bingo";
import { awardPoints } from "@/lib/services/points";
import { attachBookToQuest, detachBookFromQuest, resyncBookQuest } from "@/lib/services/quests";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const optionalId = z.string().optional().transform((s) => s || null);

export const bookSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(200),
  author: z.string().trim().min(1, "Auteur·ice requis·e").max(120),
  pages: z.coerce.number().int("Nombre entier").min(1, "Au moins 1 page").max(5000),
  /** Checkbox ("on") or boolean from Discord. Counts as ½ book for quests and bingo. */
  isGraphic: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()).default(false),
  finishedAt: z.coerce.date().optional(),
  /** LECTURE quest to attach the book to. */
  questId: optionalId,
  /** Team bingo cell to place the book on. */
  cellId: optionalId,
});
export type BookInput = z.infer<typeof bookSchema>;

/** Partial edit: only provided fields change; `questId`/`cellId` = "" detaches, undefined keeps. */
export const bookPatchSchema = bookSchema.partial();
export type BookPatch = z.infer<typeof bookPatchSchema>;

export type BookActor = { id: string; role: "ADMIN" | "PLAYER"; teamId: string | null; isCaptain: boolean };

export type BookResult = {
  book: { id: string; title: string; pages: number; isGraphic: boolean };
  points: number;
  quest: { title: string; complete: boolean; points: number } | null;
  cell: { label: string; complete: boolean; gained: string[] } | null;
};

async function playerTeam(tx: Tx, userId: string) {
  return tx.teamMember.findUnique({ where: { userId }, include: { team: { include: { challenge: true } } } });
}

async function creditReading(tx: Tx, book: { id: string; title: string; pages: number }, userId: string, teamId: string, pointsPerPage: number) {
  const base = readingPoints(book.pages, pointsPerPage);
  const ev = await awardPoints(tx, { teamId, userId, source: "READING", baseAmount: base, label: `Lecture : ${book.title}`, bookId: book.id });
  return ev?.amount ?? 0;
}

async function reverseReading(tx: Tx, bookId: string, title: string, actorId: string) {
  const events = await tx.pointEvent.findMany({ where: { bookId, source: "READING" } });
  const net = events.reduce((n, e) => n + e.amount, 0);
  const base = events.reduce((n, e) => n + e.baseAmount, 0);
  if (net === 0) return 0;
  await awardPoints(tx, { teamId: events[0].teamId, userId: actorId, source: "READING", baseAmount: -base, rawAmount: -net, label: `Annulation : ${title}`, bookId, refId: `book:${bookId}:undo` });
  return -net;
}

/** Logs a finished book, credits the team, optionally attaches it to a quest and a bingo cell. */
export async function logBook(userId: string, input: BookInput): Promise<BookResult> {
  return prisma.$transaction(async (tx) => {
    const membership = await playerTeam(tx, userId);
    if (membership && membership.team.challenge.endAt < new Date()) throw new Error("Le défi est terminé");
    if ((input.questId || input.cellId) && !membership) throw new Error("Rejoins une équipe pour valider une quête ou une case");

    const book = await tx.book.create({
      data: { userId, title: input.title, author: input.author, pages: input.pages, isGraphic: input.isGraphic, finishedAt: input.finishedAt ?? new Date() },
    });
    const points = membership ? await creditReading(tx, book, userId, membership.teamId, membership.team.challenge.pointsPerPage) : 0;
    const quest = input.questId && membership ? await attachBookToQuest(tx, book, membership.teamId, input.questId, userId) : null;
    const cell = input.cellId && membership ? await attachBookToCell(tx, book, membership.teamId, input.cellId, userId) : null;
    return { book, points, quest, cell: cell && { label: cell.label, complete: cell.complete, gained: cell.gained } };
  });
}

async function loadEditable(tx: Tx, bookId: string, actor: BookActor) {
  const book = await tx.book.findUnique({ where: { id: bookId }, include: { user: { include: { membership: { include: { team: { include: { challenge: true } } } } } } } });
  if (!book) throw new Error("Livre introuvable");
  const ownerTeam = book.user.membership?.team ?? null;
  const isCaptainOfOwner = !!ownerTeam && ownerTeam.captainId === actor.id;
  if (!canEditBook(book, { id: actor.id, role: actor.role, isCaptainOfOwner })) {
    throw new Error(
      book.userId === actor.id
        ? `Modification possible pendant 1 h après l'ajout (jusqu'à ${editDeadline(book).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}) ; ensuite, demande à ton·ta capitaine.`
        : "Seul·e le·la capitaine peut modifier ce livre",
    );
  }
  return { book, ownerTeam };
}

/** Edits a book (fields and/or links). Re-credits reading points when pages change. */
export async function updateBook(actor: BookActor, bookId: string, patch: BookPatch): Promise<BookResult> {
  return prisma.$transaction(async (tx) => {
    const { book, ownerTeam } = await loadEditable(tx, bookId, actor);
    if (ownerTeam && ownerTeam.challenge.endAt < new Date()) throw new Error("Le défi est terminé");

    const cellBefore = await snapshotCellPositions(tx, bookId);
    const updated = await tx.book.update({
      where: { id: bookId },
      data: {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.author !== undefined && { author: patch.author }),
        ...(patch.pages !== undefined && { pages: patch.pages }),
        ...(patch.isGraphic !== undefined && { isGraphic: patch.isGraphic }),
        ...(patch.finishedAt !== undefined && { finishedAt: patch.finishedAt }),
      },
    });

    let points = 0;
    if (patch.pages !== undefined && patch.pages !== book.pages && ownerTeam) {
      await reverseReading(tx, bookId, book.title, actor.id);
      points = await creditReading(tx, updated, book.userId, ownerTeam.id, ownerTeam.challenge.pointsPerPage);
    }

    let quest: BookResult["quest"] = null;
    let cell: BookResult["cell"] = null;
    if (ownerTeam) {
      const weightChanged = patch.isGraphic !== undefined && patch.isGraphic !== book.isGraphic;
      if (patch.questId !== undefined) {
        if (patch.questId) quest = await attachBookToQuest(tx, updated, ownerTeam.id, patch.questId, actor.id);
        else await detachBookFromQuest(tx, bookId, actor.id);
      } else if (weightChanged) {
        await resyncBookQuest(tx, bookId, actor.id);
      }
      if (patch.cellId !== undefined) {
        if (patch.cellId) {
          const c = await attachBookToCell(tx, updated, ownerTeam.id, patch.cellId, actor.id);
          cell = { label: c.label, complete: c.complete, gained: c.gained };
        } else await detachBookFromCell(tx, bookId, actor.id);
      } else if (weightChanged) {
        await resettleCell(tx, bookId, actor.id, cellBefore);
      }
    }
    return { book: updated, points, quest, cell };
  });
}

/** Deletes a book, detaching it from quest/cell and reversing every point it earned. */
export async function deleteBook(actor: BookActor, bookId: string) {
  return prisma.$transaction(async (tx) => {
    const { book } = await loadEditable(tx, bookId, actor);
    await detachBookFromQuest(tx, bookId, actor.id);
    await detachBookFromCell(tx, bookId, actor.id);
    await reverseReading(tx, bookId, book.title, actor.id);
    await tx.book.delete({ where: { id: bookId } });
  });
}

/** A player's books with points, links and edit permission for `actor`. */
export async function listBooks(userId: string, actor: BookActor) {
  const books = await prisma.book.findMany({
    where: { userId },
    orderBy: { finishedAt: "desc" },
    include: {
      pointEvents: { select: { amount: true } },
      questBook: { include: { quest: { select: { title: true } } } },
      bingoFill: { include: { cell: { select: { row: true, col: true } } } },
      user: { select: { name: true, membership: { select: { team: { select: { captainId: true } } } } } },
    },
  });
  return books.map((b) => ({
    ...b,
    points: b.pointEvents.reduce((n, e) => n + e.amount, 0),
    editable: canEditBook(b, { id: actor.id, role: actor.role, isCaptainOfOwner: b.user.membership?.team.captainId === actor.id }),
    editUntil: editDeadline(b),
  }));
}

/** Books of every teammate except `exceptUserId` (captain view). */
export function listTeamBooks(teamId: string, exceptUserId: string) {
  return prisma.book.findMany({
    where: { user: { membership: { teamId }, id: { not: exceptUserId } } },
    orderBy: { finishedAt: "desc" },
    include: { user: { select: { name: true } }, pointEvents: { select: { amount: true } } },
  });
}

export function getBook(bookId: string) {
  return prisma.book.findUnique({
    where: { id: bookId },
    include: {
      questBook: { select: { questId: true } },
      bingoFill: { select: { cellId: true } },
      user: { select: { id: true, name: true, membership: { select: { team: { select: { id: true, captainId: true } } } } } },
    },
  });
}
