import { requireOrganizer } from "@/lib/dal";
import { listInvites, listTeamsWithMembers, listUsersWithTeams } from "@/lib/services/admin";
import { PlayersView } from "./PlayersView";
import { assignTeamAction, createInviteAction, deleteInviteAction, setRoleAction } from "./actions";

export default async function AdminPlayersPage({ searchParams }: PageProps<"/admin/players">) {
  const params = await searchParams;
  const { user: admin, challenge } = await requireOrganizer();
  const [users, teams, invites] = await Promise.all([
    listUsersWithTeams(challenge.id),
    listTeamsWithMembers(challenge.id),
    listInvites(challenge.id),
  ]);

  return (
    <PlayersView
      players={users.map((u) => ({
        id: u.id,
        name: u.name ?? "—",
        discordId: u.discordId,
        teamId: u.team?.id ?? "",
        teamName: u.team?.name ?? null,
        isCaptain: teams.some((t) => t.captainId === u.id),
        role: u.role,
        books: u.books,
        isMe: u.id === admin.id,
      }))}
      teams={teams.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      invites={invites
        .filter((i) => !i.usedAt)
        .map((i) => ({ id: i.id, discordId: i.discordId, teamName: i.team?.name ?? null, role: i.role }))}
      hasChallenge
      params={params}
      createInviteAction={createInviteAction}
      deleteInviteAction={deleteInviteAction}
      assignTeamAction={assignTeamAction}
      setRoleAction={setRoleAction}
    />
  );
}
