import { prisma } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/dal";
import { canEditBook } from "@/lib/scoring/books";
import { getTeamBoard } from "@/lib/services/bingo";
import { BingoView } from "./BingoView";
import { placeBookAction, removeBookAction } from "./actions";

export default async function BingoPage({ searchParams }: PageProps<"/bingo">) {
  const params = await searchParams;
  const { user, team } = await getCurrentPlayer();
  if (!team) {
    return (
      <BingoView
        grid={null}
        total={0}
        history={[]}
        books={[]}
        bonus={{ line: 0, full: 0 }}
        hasTeam={false}
        params={params}
        placeBookAction={placeBookAction}
        removeBookAction={removeBookAction}
      />
    );
  }

  const [board, teamBooks] = await Promise.all([
    getTeamBoard(team.id),
    prisma.book.findMany({
      where: { teamId: team.id, deletedAt: null },
      orderBy: { finishedAt: "desc" },
      include: { user: { select: { name: true } }, bingoFill: { select: { cellId: true } } },
    }),
  ]);
  const isCaptain = team.captainId === user.id;
  const books = teamBooks
    .filter((b) => canEditBook(b, { id: user.id, role: user.role, isCaptainOfOwner: isCaptain }))
    .map((b) => ({ id: b.id, title: b.title, type: b.type, owner: b.user.name ?? "?", placedOn: b.bingoFill?.cellId ?? null }));

  return (
    <BingoView
      grid={board.grid ? { ...board.grid, completedLines: board.grid.completedLines.length } : null}
      total={board.total}
      history={board.history.map((h) => ({ id: h.id, order: h.grid.order, title: h.grid.title, completedAt: h.completedAt }))}
      books={books}
      bonus={{ line: team.challenge.bingoLineBonus, full: team.challenge.bingoFullBonus }}
      hasTeam
      params={params}
      placeBookAction={placeBookAction}
      removeBookAction={removeBookAction}
    />
  );
}
