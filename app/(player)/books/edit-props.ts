import "server-only";
import { prisma } from "@/lib/db";
import { canEditBook, VERIFICATION_MESSAGE, type ActorRole } from "@/lib/scoring/books";
import { cellChoices, questChoices } from "@/lib/services/autocomplete";
import { cellLabel } from "@/lib/services/bingo";
import { getBook } from "@/lib/services/books";
import { questLabel } from "@/lib/services/quests";
import { isVerificationWindow } from "@/lib/time/paris";
import type { BookEditProps } from "./BookEditModal";

/** Everything the edit modal needs for one reading, or null when it cannot be edited by `user`. */
export async function loadBookEdit(
  bookId: string,
  actor: { id: string; role: ActorRole; challengeId: string | null; isSuperAdmin?: boolean; name?: string | null },
): Promise<BookEditProps | null> {
  // Scoped read: a reading played in another edition is not offered for edition here.
  const book = await getBook(bookId, actor);
  if (!book) return null;
  if (!canEditBook(book, { id: actor.id, role: actor.role, isCaptainOfOwner: book.team?.captainId === actor.id, challengeId: actor.challengeId, isSuperAdmin: actor.isSuperAdmin })) return null;
  // Selects are built for the reading's (frozen) team so a captain edits a teammate's reading correctly.
  const ownerTeam = book.team
    ? await prisma.team.findUniqueOrThrow({ where: { id: book.team.id }, select: { id: true, challengeId: true, challenge: { select: { pointsPerPage: true } } } })
    : null;
  const [quests, cells] = ownerTeam ? await Promise.all([questChoices(ownerTeam.challengeId, ownerTeam.id), cellChoices(ownerTeam.id)]) : [[], []];
  return {
    title: book.userId === actor.id ? "Modifier ma lecture" : `Modifier la lecture de ${book.user.name ?? "?"}`,
    quests,
    cells,
    locked: actor.role !== "ORGANIZER" && isVerificationWindow(new Date()) ? VERIFICATION_MESSAGE : null,
    // The rate of the edition the reading belongs to, not of the one being browsed.
    pointsPerPage: ownerTeam?.challenge.pointsPerPage,
    currentQuest: book.questBook ? { value: book.questBook.questId, name: questLabel(book.questBook.quest) } : null,
    currentCell: book.bingoFill ? { value: book.bingoFill.cellId, name: `${cellLabel(book.bingoFill.cell.row, book.bingoFill.cell.col)} — ${book.bingoFill.cell.prompt}` } : null,
    values: {
      id: book.id,
      title: book.title,
      author: book.author,
      pages: book.pages,
      coverUrl: book.coverUrl,
      type: book.isGraphic ? "GRAPHIQUE" : "ROMAN",
      finishedAt: book.finishedAt.toISOString().slice(0, 10),
      questId: book.questBook?.questId ?? "",
      cellId: book.bingoFill?.cellId ?? "",
    },
  };
}
