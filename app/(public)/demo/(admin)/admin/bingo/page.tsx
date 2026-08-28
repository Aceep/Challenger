import { BingoAdminView, type TeamBoard } from "@/app/admin/bingo/BingoAdminView";
import { DEMO_ADMIN_GRIDS, DEMO_GRID, DEMO_GRID_HISTORY, DEMO_GRID_TOTAL, DEMO_PLACEABLE_BOOKS, DEMO_TEAM, DEMO_TEAMS } from "@/lib/demo/data";
import { demoAction, demoStateAction } from "@/lib/demo/actions";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function DemoAdminBingoPage({ searchParams }: PageProps<"/demo/admin/bingo">) {
  const params = await searchParams;
  const edit = one(params.edit);
  const action = demoAction.bind(null, "/demo/admin/bingo");

  // Only Les Renards have a board in the fixtures; the other teams have not opened their grid.
  const selected = DEMO_TEAMS.find((t) => t.id === one(params.team)) ?? DEMO_TEAM;
  const teamBoard: TeamBoard = {
    teamId: selected.id,
    teamName: selected.name,
    grid: selected.id === DEMO_TEAM.id ? DEMO_GRID : null,
    total: selected.id === DEMO_TEAM.id ? DEMO_GRID_TOTAL : 0,
    history: selected.id === DEMO_TEAM.id ? DEMO_GRID_HISTORY : [],
    books: selected.id === DEMO_TEAM.id ? DEMO_PLACEABLE_BOOKS : [],
  };

  return (
    <BingoAdminView
      grids={DEMO_ADMIN_GRIDS}
      teams={DEMO_TEAMS.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      hasChallenge
      bonus={{ line: 25, full: 100 }}
      editingId={edit || null}
      params={params}
      teamBoard={teamBoard}
      demo
      saveGridAction={demoStateAction}
      moveGridAction={action}
      deleteGridAction={action}
      placeTeamBookAction={action}
      removeTeamBookAction={action}
    />
  );
}
