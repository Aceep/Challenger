import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/dal";
import { canEditBook } from "@/lib/scoring/books";
import { cellChoices, lectureQuestChoices } from "@/lib/services/autocomplete";
import { cellLabel } from "@/lib/services/bingo";
import { getBook } from "@/lib/services/books";
import { prisma } from "@/lib/db";
import { BookForm } from "../../BookForm";
import { updateBookAction } from "../../actions";

export default async function EditBookPage({ params }: PageProps<"/books/[id]/edit">) {
  const { id } = await params;
  const { user, team } = await getCurrentPlayer();
  const book = await getBook(id);
  if (!book) notFound();

  const ownerTeam = book.user.membership?.team ?? null;
  const editable = canEditBook(book, { id: user.id, role: user.role, isCaptainOfOwner: ownerTeam?.captainId === user.id });
  if (!editable) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1 className="text-2xl font-bold">Modifier un livre</h1>
        <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {book.userId === user.id
            ? "La modification n'est possible que pendant 1 h après l'ajout. Demande à ton·ta capitaine."
            : "Seul·e le·la capitaine de l'équipe peut modifier ce livre."}
        </p>
      </main>
    );
  }

  // Selects are built for the book owner's team so a captain edits a teammate's book correctly.
  const teamForBook = ownerTeam ?? team;
  const [quests, cells, currentQuest, currentCell] = teamForBook
    ? await Promise.all([
        lectureQuestChoices(teamForBook.id === team?.id ? team.challengeId : (await prisma.team.findUniqueOrThrow({ where: { id: teamForBook.id } })).challengeId, book.userId, teamForBook.id),
        cellChoices(teamForBook.id === team?.id ? team.challengeId : (await prisma.team.findUniqueOrThrow({ where: { id: teamForBook.id } })).challengeId, teamForBook.id),
        book.questBook ? prisma.quest.findUnique({ where: { id: book.questBook.questId }, select: { id: true, title: true } }) : null,
        book.bingoFill ? prisma.bingoCell.findUnique({ where: { id: book.bingoFill.cellId }, select: { id: true, row: true, col: true, prompt: true } }) : null,
      ])
    : [[], [], null, null];

  return (
    <BookForm
      action={updateBookAction}
      title={book.userId === user.id ? "Modifier mon livre" : `Modifier le livre de ${book.user.name ?? "?"}`}
      submitLabel="Enregistrer les modifications"
      quests={quests}
      cells={cells}
      currentQuest={currentQuest ? { value: currentQuest.id, name: currentQuest.title } : null}
      currentCell={currentCell ? { value: currentCell.id, name: `${cellLabel(currentCell.row, currentCell.col)} — ${currentCell.prompt}` } : null}
      values={{
        id: book.id,
        title: book.title,
        author: book.author,
        pages: book.pages,
        isGraphic: book.isGraphic,
        finishedAt: book.finishedAt.toISOString().slice(0, 10),
        questId: book.questBook?.questId ?? "",
        cellId: book.bingoFill?.cellId ?? "",
      }}
    />
  );
}
