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
    <main className="flex flex-1 flex-col gap-6 p-5">
      <header>
        <h1 className="text-2xl font-bold">Bingo d&apos;équipe</h1>
        {board.total > 0 && (
          <p className="text-sm text-slate-500">
            {board.grid ? `Grille ${board.grid.order} sur ${board.total}` : `Les ${board.total} grilles sont terminées 🏆`}
          </p>
        )}
      </header>
      {board.grid ? (
        <BingoBoard title={board.grid.title} size={board.grid.size} cells={board.grid.cells} books={books} completedLines={board.grid.completedLines.length} />
      ) : board.total === 0 ? (
        <p className="text-slate-500">La première grille n&apos;est pas encore prête.</p>
      ) : null}
      {board.history.length > 0 && (
        <section className="text-sm text-slate-500">
          <h2 className="mb-1 font-semibold uppercase">Grilles terminées</h2>
          <ul>
            {board.history.map((h) => (
              <li key={h.id}>
                ✅ Grille {h.grid.order} — {h.grid.title}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-slate-500">
        Un roman valide une case ; deux graphiques (d&apos;un ou deux membres de l&apos;équipe) aussi. Une case avec une seule moitié est « en attente » et ne rapporte rien. Ligne, colonne ou diagonale complète : {team.challenge.bingoLineBonus} pts ; grille entière : {team.challenge.bingoFullBonus} pts, puis la grille suivante s&apos;ouvre.
      </p>
    </main>
  );
}
