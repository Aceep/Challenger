import "server-only";
import { prisma } from "@/lib/db";
import { canEditBook, VERIFICATION_MESSAGE } from "@/lib/scoring/books";
import { cellChoices, questChoices } from "@/lib/services/autocomplete";
import { cellLabel } from "@/lib/services/bingo";
import { getBook } from "@/lib/services/books";
import { questLabel } from "@/lib/services/quests";
import { isVerificationWindow } from "@/lib/time/paris";
import type { BookEditProps } from "./BookEditModal";

/** Everything the edit modal needs for one reading, or null when it cannot be edited by `user`. */
export async function loadBookEdit(bookId: string, user: { id: string; role: "ADMIN" | "PLAYER"; name?: string | null }): Promise<BookEditProps | null> {
  const book = await getBook(bookId);
  if (!book) return null;
  if (!canEditBook(book, { id: user.id, role: user.role, isCaptainOfOwner: book.team?.captainId === user.id })) return null;
  // Selects are built for the reading's (frozen) team so a captain edits a teammate's reading correctly.
  const ownerTeam = book.team ? await prisma.team.findUniqueOrThrow({ where: { id: book.team.id }, select: { id: true, challengeId: true } }) : null;
  const [quests, cells] = ownerTeam ? await Promise.all([questChoices(ownerTeam.challengeId, ownerTeam.id), cellChoices(ownerTeam.id)]) : [[], []];
  return {
    title: book.userId === user.id ? "Modifier ma lecture" : `Modifier la lecture de ${book.user.name ?? "?"}`,
    quests,
    cells,
    locked: user.role !== "ADMIN" && isVerificationWindow(new Date()) ? VERIFICATION_MESSAGE : null,
    currentQuest: book.questBook ? { value: book.questBook.questId, name: questLabel(book.questBook.quest) } : null,
    currentCell: book.bingoFill ? { value: book.bingoFill.cellId, name: `${cellLabel(book.bingoFill.cell.row, book.bingoFill.cell.col)} — ${book.bingoFill.cell.prompt}` } : null,
    values: {
      id: book.id,
      title: book.title,
      author: book.author,
      pages: book.pages,
      type: book.isGraphic ? "GRAPHIQUE" : "ROMAN",
      finishedAt: book.finishedAt.toISOString().slice(0, 10),
      questId: book.questBook?.questId ?? "",
      cellId: book.bingoFill?.cellId ?? "",
    },
  };
}
