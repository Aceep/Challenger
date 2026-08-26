import { prisma } from "@/lib/db";
import { getActiveChallenge, getCurrentPlayer } from "@/lib/dal";
import { completedLines } from "@/lib/scoring/bingo";
import { getGridWithFills } from "@/lib/services/bingo";
import { BingoBoard, type BoardCell } from "./BingoBoard";

export default async function BingoPage() {
  const { user, team } = await getCurrentPlayer();
  const challenge = team?.challenge ?? (await getActiveChallenge());

  if (!challenge) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1 className="text-2xl font-bold">Bingo</h1>
        <p className="text-slate-500">Aucun défi actif.</p>
      </main>
    );
  }

  const [playerGrid, teamGrid, myBooks, teamBooks] = await Promise.all([
    getGridWithFills(challenge.id, { scope: "PLAYER", userId: user.id, teamId: team?.id ?? null }),
    team ? getGridWithFills(challenge.id, { scope: "TEAM", teamId: team.id }) : null,
    prisma.book.findMany({ where: { userId: user.id }, orderBy: { finishedAt: "desc" }, select: { id: true, title: true, author: true } }),
    team
      ? prisma.book.findMany({
          where: { user: { membership: { teamId: team.id } } },
          orderBy: { finishedAt: "desc" },
          select: { id: true, title: true, author: true, user: { select: { name: true } } },
        })
      : [],
  ]);

  const toCells = (g: NonNullable<typeof playerGrid>): BoardCell[] =>
    g.cells.map((c) => ({ id: c.id, row: c.row, col: c.col, prompt: c.prompt, fill: c.fill ? { book: c.fill.book } : null }));
  const lines = (g: NonNullable<typeof playerGrid>) =>
    completedLines(g.cells.filter((c) => c.fill).map((c) => ({ row: c.row, col: c.col })), g.size);

  return (
    <main className="flex flex-1 flex-col gap-8 p-5">
      <h1 className="text-2xl font-bold">Bingo</h1>

      {playerGrid ? (
        <BingoBoard
          scope="PLAYER"
          title={playerGrid.title}
          size={playerGrid.size}
          cells={toCells(playerGrid)}
          books={myBooks}
          completedLines={lines(playerGrid)}
          canEdit
        />
      ) : (
        <p className="text-slate-500">Pas encore de grille individuelle.</p>
      )}

      {team &&
        (teamGrid ? (
          <BingoBoard
            scope="TEAM"
            title={`${teamGrid.title} — ${team.name}`}
            size={teamGrid.size}
            cells={toCells(teamGrid)}
            books={teamBooks.map((b) => ({ id: b.id, title: b.title, author: b.author, owner: b.user.name }))}
            completedLines={lines(teamGrid)}
            canEdit
          />
        ) : (
          <p className="text-slate-500">Pas encore de grille d&apos;équipe.</p>
        ))}

      <p className="text-xs text-slate-500">
        Une ligne, colonne ou diagonale complète rapporte {challenge.bingoLineBonus} pts à l&apos;équipe, la grille entière{" "}
        {challenge.bingoFullBonus} pts.
      </p>
    </main>
  );
}
