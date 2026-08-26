import { prisma } from "@/lib/db";
import { getActiveChallenge } from "@/lib/dal";
import { GridForm } from "./GridForm";

export default async function AdminBingoPage() {
  const challenge = await getActiveChallenge();
  const grids = challenge
    ? await prisma.bingoGrid.findMany({
        where: { challengeId: challenge.id },
        include: { cells: { orderBy: [{ row: "asc" }, { col: "asc" }] } },
      })
    : [];
  const byScope = (scope: "PLAYER" | "TEAM") => {
    const g = grids.find((x) => x.scope === scope);
    return g ? { title: g.title, size: g.size, prompts: g.cells.map((c) => c.prompt) } : null;
  };

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Bingo</h1>
      {!challenge ? (
        <p className="text-slate-500">Active un défi pour configurer les grilles.</p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Bonus actuels : {challenge.bingoLineBonus} pts par ligne, {challenge.bingoFullBonus} pts pour la grille complète (modifiables dans « Défi »).
          </p>
          <GridForm scope="PLAYER" grid={byScope("PLAYER")} />
          <GridForm scope="TEAM" grid={byScope("TEAM")} />
        </>
      )}
    </main>
  );
}
