import { requireOrganizer } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { listTeamsWithMembers } from "@/lib/services/admin";
import { getLeaderboard } from "@/lib/services/leaderboard";
import { TeamsView } from "./TeamsView";
import { createTeamAction, deleteTeamAction, setCaptainAction, setDeputyAction, updateTeamAction } from "./actions";

export default async function AdminTeamsPage({ searchParams }: PageProps<"/admin/teams">) {
  const { challenge } = await requireOrganizer();
  const params = await searchParams;
  const actions = { createTeamAction, updateTeamAction, deleteTeamAction, setCaptainAction, setDeputyAction };

  const [teams, rows, grids, teamGrids] = await Promise.all([
    listTeamsWithMembers(challenge.id),
    getLeaderboard(challenge.id),
    prisma.bingoGrid.count({ where: { challengeId: challenge.id } }),
    prisma.teamGrid.findMany({ where: { grid: { challengeId: challenge.id } }, include: { grid: { select: { order: true } } } }),
  ]);
  const points = new Map(rows.map((r) => [r.teamId, r.points]));
  const deputies = await prisma.user.findMany({
    where: { id: { in: teams.map((t) => t.deputyId).filter((x): x is string => !!x) } },
    select: { id: true, name: true },
  });
  const edit = Array.isArray(params.edit) ? params.edit[0] : params.edit;

  return (
    <TeamsView
      teams={teams.map((t) => {
        const current = teamGrids.filter((g) => g.teamId === t.id).sort((a, b) => b.grid.order - a.grid.order)[0];
        return {
          id: t.id,
          name: t.name,
          color: t.color,
          members: t.members.map((m) => ({ id: m.userId, name: m.user.name ?? m.user.discordId ?? "?" })),
          captain: t.captain?.name ?? null,
          captainId: t.captainId ?? "",
          deputy: deputies.find((d) => d.id === t.deputyId)?.name ?? null,
          deputyId: t.deputyId ?? "",
          adventureChannel: t.discordChannelId,
          libraryChannel: t.discordLibraryChannelId,
          discordRole: t.discordRoleId,
          gridLabel: grids ? `${current?.grid.order ?? 0} / ${grids}` : "—",
          points: points.get(t.id) ?? 0,
        };
      })}
      hasChallenge
      editingId={edit ?? null}
      params={params}
      {...actions}
    />
  );
}
