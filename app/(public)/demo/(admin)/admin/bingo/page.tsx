import { BingoAdminView } from "@/app/admin/bingo/BingoAdminView";
import { DEMO_ADMIN_GRIDS, DEMO_TEAMS } from "@/lib/demo/data";
import { demoAction, demoStateAction } from "@/lib/demo/actions";

export default async function DemoAdminBingoPage({ searchParams }: PageProps<"/demo/admin/bingo">) {
  const params = await searchParams;
  const edit = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const action = demoAction.bind(null, "/demo/admin/bingo");
  return (
    <BingoAdminView
      grids={DEMO_ADMIN_GRIDS}
      teams={DEMO_TEAMS.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      hasChallenge
      bonus={{ line: 25, full: 100 }}
      editingId={edit ?? null}
      params={params}
      demo
      saveGridAction={demoStateAction}
      moveGridAction={action}
      deleteGridAction={action}
    />
  );
}
