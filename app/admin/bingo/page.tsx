import { requireOrganizer } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { bookWeight, isComplete } from "@/lib/scoring/reading";
import { getTeamBoard, listGridsAdmin } from "@/lib/services/bingo";
import { BingoAdminView, type GridProgress, type TeamBoard } from "./BingoAdminView";
import { deleteGridAction, moveGridAction, placeTeamBookAction, removeTeamBookAction, saveGridAction } from "./actions";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AdminBingoPage({ searchParams }: PageProps<"/admin/bingo">) {
  const { challenge } = await requireOrganizer();
  const params = await searchParams;
  const noBoard = { placeTeamBookAction: placeTeamBookAction.bind(null, ""), removeTeamBookAction: removeTeamBookAction.bind(null, "") };
  if (!challenge) {
    return (
      <BingoAdminView
        grids={[]}
        teams={[]}
        hasChallenge={false}
        bonus={{ line: 0, full: 0 }}
        editingId={null}
        params={params}
        teamBoard={null}
        saveGridAction={saveGridAction}
        moveGridAction={moveGridAction}
        deleteGridAction={deleteGridAction}
        {...noBoard}
      />
    );
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
  const edit = one(params.edit);

  // Board of one team (`?team=`), with every reading it may place or move.
  const selected = teams.find((t) => t.id === one(params.team)) ?? teams[0] ?? null;
  let teamBoard: TeamBoard | null = null;
  if (selected) {
    const [board, teamBooks] = await Promise.all([
      getTeamBoard(selected.id),
      prisma.book.findMany({
        where: { teamId: selected.id, deletedAt: null },
        orderBy: { finishedAt: "desc" },
        include: { user: { select: { name: true } }, bingoFill: { select: { cellId: true } } },
      }),
    ]);
    teamBoard = {
      teamId: selected.id,
      teamName: selected.name,
      grid: board.grid ? { ...board.grid, completedLines: board.grid.completedLines.length } : null,
      total: board.total,
      history: board.history.map((h) => ({ id: h.id, order: h.grid.order, title: h.grid.title, completedAt: h.completedAt })),
      books: teamBooks.map((b) => ({ id: b.id, title: b.title, type: b.type, owner: b.user.name ?? "?", placedOn: b.bingoFill?.cellId ?? null })),
    };
  }

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
      editingId={edit || null}
      params={params}
      teamBoard={teamBoard}
      saveGridAction={saveGridAction}
      moveGridAction={moveGridAction}
      deleteGridAction={deleteGridAction}
      placeTeamBookAction={placeTeamBookAction.bind(null, selected?.id ?? "")}
      removeTeamBookAction={removeTeamBookAction.bind(null, selected?.id ?? "")}
    />
  );
}
