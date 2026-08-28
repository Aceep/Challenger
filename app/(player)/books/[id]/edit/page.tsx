import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/dal";
import { canEditBook, VERIFICATION_MESSAGE } from "@/lib/scoring/books";
import { cellChoices, questChoices } from "@/lib/services/autocomplete";
import { cellLabel } from "@/lib/services/bingo";
import { getBook } from "@/lib/services/books";
import { questLabel } from "@/lib/services/quests";
import { prisma } from "@/lib/db";
import { isVerificationWindow } from "@/lib/time/paris";
import { BookForm } from "../../BookForm";
import { updateBookAction } from "../../actions";

export default async function EditBookPage({ params }: PageProps<"/books/[id]/edit">) {
  const { id } = await params;
  const { user } = await getCurrentPlayer();
  const book = await getBook(id);
  if (!book) notFound();

  const editable = canEditBook(book, { id: user.id, role: user.role, isCaptainOfOwner: book.team?.captainId === user.id });
  if (!editable) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1>Modifier une lecture</h1>
        <p className="flash warn">
          {book.userId === user.id
            ? "La modification n'est possible que pendant 1 h après l'ajout. Demande à ton·ta capitaine."
            : "Seul·e le·la capitaine de l'équipe peut modifier cette lecture."}
        </p>
      </main>
    );
  }

  // Selects are built for the reading's (frozen) team so a captain edits a teammate's reading correctly.
  const ownerTeam = book.team ? await prisma.team.findUniqueOrThrow({ where: { id: book.team.id }, select: { id: true, challengeId: true } }) : null;
  const [quests, cells] = ownerTeam ? await Promise.all([questChoices(ownerTeam.challengeId, ownerTeam.id), cellChoices(ownerTeam.id)]) : [[], []];
  const locked = user.role !== "ADMIN" && isVerificationWindow(new Date()) ? VERIFICATION_MESSAGE : null;

  return (
    <BookForm
      action={updateBookAction}
      title={book.userId === user.id ? "Modifier ma lecture" : `Modifier la lecture de ${book.user.name ?? "?"}`}
      submitLabel="Enregistrer les modifications"
      quests={quests}
      cells={cells}
      locked={locked}
      currentQuest={book.questBook ? { value: book.questBook.questId, name: questLabel(book.questBook.quest) } : null}
      currentCell={book.bingoFill ? { value: book.bingoFill.cellId, name: `${cellLabel(book.bingoFill.cell.row, book.bingoFill.cell.col)} — ${book.bingoFill.cell.prompt}` } : null}
      values={{
        id: book.id,
        title: book.title,
        author: book.author,
        pages: book.pages,
        type: book.isGraphic ? "GRAPHIQUE" : "ROMAN",
        finishedAt: book.finishedAt.toISOString().slice(0, 10),
        questId: book.questBook?.questId ?? "",
        cellId: book.bingoFill?.cellId ?? "",
      }}
    />
  );
}
