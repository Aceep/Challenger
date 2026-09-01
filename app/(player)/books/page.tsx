import { getCurrentPlayer } from "@/lib/dal";
import { cellLabel } from "@/lib/services/bingo";
import { listBooks, listTeamBooks } from "@/lib/services/books";
import { BooksView, type BookRow } from "./BooksView";
import { deleteBookAction, updateBookAction } from "./actions";
import { loadBookEdit } from "./edit-props";

type Listed = Awaited<ReturnType<typeof listBooks>>[number];

const toRow = (b: Listed, viewerId: string, canSeeDeadline: boolean): BookRow => ({
  id: b.id,
  title: b.title,
  author: b.author,
  pages: b.pages,
  type: b.type,
  finishedAt: b.finishedAt,
  points: b.points,
  coverUrl: b.coverUrl,
  owner: b.user.name ?? "?",
  editable: b.editable,
  editUntil: b.userId === viewerId && canSeeDeadline && b.editUntil > new Date() ? b.editUntil : null,
  questNumber: b.questBook?.quest.number ?? null,
  questHalf: b.type === "GRAPHIQUE",
  cellLabel: b.bingoFill ? cellLabel(b.bingoFill.cell.row, b.bingoFill.cell.col) : null,
  cellHalf: b.type === "GRAPHIQUE",
});

export default async function BooksPage({ searchParams }: PageProps<"/books">) {
  const { user, challenge, role, team } = await getCurrentPlayer();
  const params = await searchParams;
  const isCaptain = team?.captainId === user.id;
  const actor = { id: user.id, role: role ?? "PLAYER", challengeId: challenge?.id ?? null, teamId: team?.id ?? null, isCaptain, isSuperAdmin: user.isSuperAdmin } as const;
  const [books, teamBooks] = await Promise.all([
    listBooks(user.id, actor),
    isCaptain && team ? listTeamBooks(team.id, user.id, actor) : Promise.resolve([]),
  ]);
  const showDeadline = !isCaptain && role !== "ORGANIZER";
  const editId = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const editing = editId ? await loadBookEdit(editId, { ...user, role: role ?? "PLAYER", challengeId: challenge?.id ?? null }) : null;
  const flash = editId && !editing ? { ...params, error: "Cette lecture n’est plus modifiable (délai d’1 h dépassé — demande à ton·ta capitaine)." } : params;

  return (
    <BooksView
      books={books.map((b) => toRow(b, user.id, showDeadline))}
      teamBooks={teamBooks.map((b) => toRow(b, user.id, showDeadline))}
      isCaptain={isCaptain}
      teamColor={team?.color ?? "#2E4A7D"}
      params={flash}
      deleteBookAction={deleteBookAction}
      editing={editing}
      updateBookAction={updateBookAction}
    />
  );
}
