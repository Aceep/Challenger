import { getActiveChallenge } from "@/lib/dal";
import { getGridAdmin } from "@/lib/services/bingo";
import { GridForm } from "./GridForm";

export default async function AdminBingoPage() {
  const challenge = await getActiveChallenge();
  const grid = challenge ? await getGridAdmin(challenge.id) : null;

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Bingo</h1>
      {!challenge ? (
        <p className="text-slate-500">Active un défi pour configurer la grille.</p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Une seule grille, partagée par toutes les équipes (chacune la remplit avec ses livres). Une case accepte un livre, ou deux graphiques. Bonus actuels : {challenge.bingoLineBonus} pts par ligne,{" "}
            {challenge.bingoFullBonus} pts pour la grille complète (modifiables dans « Défi »).
          </p>
          <GridForm grid={grid ? { title: grid.title, size: grid.size, prompts: grid.cells.map((c) => c.prompt) } : null} />
        </>
      )}
    </main>
  );
}
