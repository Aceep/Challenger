import { PlayersView } from "@/app/admin/players/PlayersView";
import { DEMO_ADMIN_INVITES, DEMO_ADMIN_PLAYERS, DEMO_TEAMS } from "@/lib/demo/data";
import { demoAction, demoStateAction } from "@/lib/demo/actions";

export default async function DemoAdminPlayersPage({ searchParams }: PageProps<"/demo/admin/players">) {
  const action = demoAction.bind(null, "/demo/admin/players");
  return (
    <PlayersView
      players={DEMO_ADMIN_PLAYERS}
      teams={DEMO_TEAMS.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      invites={DEMO_ADMIN_INVITES}
      hasChallenge
      params={await searchParams}
      demo
      createInviteAction={demoStateAction}
      deleteInviteAction={action}
      assignTeamAction={action}
      setRoleAction={action}
    />
  );
}
