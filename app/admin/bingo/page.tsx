import { getActiveChallenge } from "@/lib/dal";
import { listGridsAdmin } from "@/lib/services/bingo";
import { GridForm } from "./GridForm";
import { GridList } from "./GridList";

export default async function AdminBingoPage() {
  const challenge = await getActiveChallenge();
  const grids = challenge ? await listGridsAdmin(challenge.id) : [];

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Bingo</h1>
      {!challenge ? (
        <p className="text-slate-500">Active un défi pour configurer les grilles.</p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Une série de grilles, jouées dans l&apos;ordre par toutes les équipes : chaque équipe est sur une grille à la fois et passe à la suivante quand toutes ses cases sont validées. Une case accepte un roman, ou deux graphiques. Bonus actuels : {challenge.bingoLineBonus} pts par ligne, {challenge.bingoFullBonus} pts pour la grille complète (modifiables dans « Défi »).
          </p>
          <GridList grids={grids.map((g) => ({ id: g.id, order: g.order, title: g.title, size: g.size, prompts: g.cells.map((c) => c.prompt), teams: g._count.teamGrids }))} />
          <section>
            <h2 className="mb-2 font-semibold">Ajouter une grille (n° {grids.length + 1})</h2>
            <GridForm grid={null} />
          </section>
        </>
      )}
    </main>
  );
}
