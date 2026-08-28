import { getActiveChallenge } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { bookWeight, isComplete } from "@/lib/scoring/reading";
import { listGridsAdmin } from "@/lib/services/bingo";
import { BingoAdminView, type GridProgress } from "./BingoAdminView";
import { deleteGridAction, moveGridAction, saveGridAction } from "./actions";

export default async function AdminBingoPage({ searchParams }: PageProps<"/admin/bingo">) {
  const params = await searchParams;
  const challenge = await getActiveChallenge();
  const actions = { saveGridAction, moveGridAction, deleteGridAction };
  if (!challenge) {
    return <BingoAdminView grids={[]} teams={[]} hasChallenge={false} bonus={{ line: 0, full: 0 }} editingId={null} params={params} {...actions} />;
  }

  const [grids, teams, teamGrids, fills] = await Promise.all([
    listGridsAdmin(challenge.id),
    prisma.team.findMany({ where: { challengeId: challenge.id }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
    prisma.teamGrid.findMany({ where: { grid: { challengeId: challenge.id } }, select: { teamId: true, gridId: true, completedAt: true } }),
    prisma.bingoFill.findMany({
      where: { cell: { grid: { challengeId: challenge.id } }, book: { deletedAt: null } },
      select: { teamId: true, cellId: true, book: { select: { type: true } } },
    }),
  ]);

  const weights = new Map<string, number[]>();
  for (const f of fills) {
    const key = `${f.teamId}:${f.cellId}`;
    weights.set(key, [...(weights.get(key) ?? []), bookWeight(f.book.type)]);
  }
  const edit = Array.isArray(params.edit) ? params.edit[0] : params.edit;

  return (
    <BingoAdminView
      grids={grids.map((g) => ({
        id: g.id,
        order: g.order,
        title: g.title,
        size: g.size,
        prompts: g.cells.map((c) => c.prompt),
        teams: teams.map((t) => {
          const opened = teamGrids.find((tg) => tg.teamId === t.id && tg.gridId === g.id);
          if (!opened) return { teamId: t.id, name: t.name, cells: null, completed: false };
          const cells: GridProgress[] = g.cells.map((c) => {
            const w = weights.get(`${t.id}:${c.id}`) ?? [];
            return isComplete(w) ? "done" : w.length > 0 ? "half" : "free";
          });
          return { teamId: t.id, name: t.name, cells, completed: !!opened.completedAt };
        }),
      }))}
      teams={teams}
      hasChallenge
      bonus={{ line: challenge.bingoLineBonus, full: challenge.bingoFullBonus }}
      editingId={edit ?? null}
      params={params}
      {...actions}
    />
  );
}
