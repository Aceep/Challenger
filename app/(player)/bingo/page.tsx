import { prisma } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/dal";
import { canEditBook } from "@/lib/scoring/books";
import { getTeamBoard } from "@/lib/services/bingo";
import { BingoBoard } from "./BingoBoard";

export default async function BingoPage() {
  const { user, team } = await getCurrentPlayer();
  if (!team) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1 className="text-2xl font-bold">Bingo</h1>
        <p className="text-slate-500">Rejoins une équipe pour jouer au bingo.</p>
      </main>
    );
  }

  const [board, teamBooks] = await Promise.all([
    getTeamBoard(team.challengeId, team.id),
    prisma.book.findMany({
      where: { user: { membership: { teamId: team.id } } },
      orderBy: { finishedAt: "desc" },
      include: { user: { select: { name: true } }, bingoFill: { select: { cellId: true } } },
    }),
  ]);
  const isCaptain = team.captainId === user.id;
  const books = teamBooks
    .filter((b) => canEditBook(b, { id: user.id, role: user.role, isCaptainOfOwner: isCaptain }))
    .map((b) => ({ id: b.id, title: b.title, isGraphic: b.isGraphic, owner: b.user.name ?? "?", placedOn: b.bingoFill?.cellId ?? null }));

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <h1 className="text-2xl font-bold">Bingo d&apos;équipe</h1>
      {board ? (
        <BingoBoard title={`${board.title} — ${team.name}`} size={board.size} cells={board.cells} books={books} completedLines={board.completedLines.length} />
      ) : (
        <p className="text-slate-500">La grille n&apos;est pas encore prête.</p>
      )}
      <p className="text-xs text-slate-500">
        Une ligne, colonne ou diagonale de cases complètes rapporte {team.challenge.bingoLineBonus} pts à l&apos;équipe, la grille entière {team.challenge.bingoFullBonus} pts.
      </p>
    </main>
  );
}
