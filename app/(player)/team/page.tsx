import { getCurrentPlayer } from "@/lib/dal";
import { getTeamStats } from "@/lib/services/team";
import { TeamView } from "./TeamView";
import { setDeputyAction } from "./actions";

export default async function TeamPage({ searchParams }: PageProps<"/team">) {
  const params = await searchParams;
  const { user, role, team } = await getCurrentPlayer();
  if (!team) {
    return (
      <TeamView
        team={null}
        captain={null}
        deputy={null}
        total={0}
        bySource={{}}
        members={[]}
        modifiers={[]}
        recent={[]}
        canNameDeputy={false}
        currentDeputyId=""
        params={params}
      />
    );
  }

  const stats = await getTeamStats(team.id);

  return (
    <TeamView
      team={{ id: team.id, name: team.name, color: team.color }}
      captain={stats.team.captain?.name ?? null}
      deputy={stats.team.deputy?.name ?? null}
      total={stats.total}
      bySource={stats.bySource}
      members={stats.members.map((m) => ({
        id: m.id,
        name: m.name,
        books: m.books,
        graphics: m.graphics,
        pages: m.pages,
        points: m.points,
        isCaptain: m.isCaptain,
        isDeputy: m.isDeputy,
      }))}
      modifiers={stats.modifiers.map((m) => ({ id: m.id, label: m.label, multiplier: m.multiplier, endAt: m.endAt }))}
      recent={stats.recent.map((e) => ({ id: e.id, label: e.label, who: e.who, amount: e.amount }))}
      canNameDeputy={team.captainId === user.id || role === "ORGANIZER"}
      currentDeputyId={team.deputyId ?? ""}
      params={params}
      setDeputyAction={setDeputyAction}
    />
  );
}
