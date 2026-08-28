import { BooksView } from "@/app/(player)/books/BooksView";
import { DEMO_CELL_CHOICES, DEMO_MY_BOOKS, DEMO_QUEST_CHOICES, DEMO_TEAM, DEMO_TEAM_BOOKS } from "@/lib/demo/data";
import { demoAction, demoStateAction } from "@/lib/demo/actions";

export default async function DemoBooksPage({ searchParams }: PageProps<"/demo/books">) {
  const params = await searchParams;
  const editId = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const book = editId ? DEMO_MY_BOOKS.find((b) => b.id === editId) : null;
  const editing = book
    ? {
        title: "Modifier ma lecture",
        quests: DEMO_QUEST_CHOICES,
        cells: DEMO_CELL_CHOICES,
        currentQuest: null,
        currentCell: null,
        locked: null,
        values: {
          id: book.id,
          title: book.title,
          author: book.author,
          pages: book.pages,
          type: book.type,
          finishedAt: book.finishedAt.toISOString().slice(0, 10),
          questId: "",
          cellId: "",
        },
      }
    : null;
  return (
    <BooksView
      books={DEMO_MY_BOOKS}
      teamBooks={DEMO_TEAM_BOOKS}
      isCaptain={false}
      teamColor={DEMO_TEAM.color}
      params={params}
      demo
      deleteBookAction={demoAction.bind(null, "/demo/books")}
      editing={editing}
      updateBookAction={demoStateAction}
    />
  );
}
