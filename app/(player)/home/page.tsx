import { signOut } from "@/auth";
import { getCurrentPlayer } from "@/lib/dal";
import { getHomeSummary } from "@/lib/services/home";
import { HomeView } from "./HomeView";

export default async function HomePage() {
  const { user, team } = await getCurrentPlayer();
  const summary = await getHomeSummary(user.id, team ? { id: team.id, challengeId: team.challengeId, startAt: team.challenge.startAt, endAt: team.challenge.endAt } : null);
  const { rows, score } = summary;
  const me = rows.findIndex((r) => r.teamId === team?.id);
  const ahead = me > 0 ? rows[me - 1] : null;

  return (
    <HomeView
      userName={user.name ?? "lecteur·ice"}
      team={team ? { name: team.name, color: team.color } : null}
      challengeName={team?.challenge.name ?? null}
      challengeOver={!!team && team.challenge.endAt < new Date()}
      score={score}
      rank={
        me >= 0
          ? { position: rows[me].rank, total: rows.length, gapPoints: ahead ? Math.round((ahead.points - rows[me].points) * 10) / 10 : 0, ahead: ahead?.name ?? "" }
          : null
      }
      stats={summary.stats}
      week={{ vote: summary.vote, pendingCells: summary.pendingCells }}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    />
  );
}
