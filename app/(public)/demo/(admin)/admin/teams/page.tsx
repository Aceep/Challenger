import { TeamsView } from "@/app/admin/teams/TeamsView";
import { DEMO_ADMIN_TEAMS } from "@/lib/demo/data";
import { demoAction, demoStateAction } from "@/lib/demo/actions";

export default async function DemoAdminTeamsPage({ searchParams }: PageProps<"/demo/admin/teams">) {
  const params = await searchParams;
  const edit = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const action = demoAction.bind(null, "/demo/admin/teams");
  return (
    <TeamsView
      teams={DEMO_ADMIN_TEAMS}
      hasChallenge
      editingId={edit ?? null}
      params={params}
      demo
      createTeamAction={demoStateAction}
      updateTeamAction={action}
      deleteTeamAction={action}
      setCaptainAction={action}
      setDeputyAction={action}
      publishGuideAction={action}
    />
  );
}
