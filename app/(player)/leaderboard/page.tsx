import { getCurrentPlayer } from "@/lib/dal";
import { getLeaderboard } from "@/lib/services/leaderboard";
import { LeaderboardView } from "./LeaderboardView";

export default async function LeaderboardPage() {
  const { team, challenge } = await getCurrentPlayer();
  if (!challenge) return <LeaderboardView challengeName={null} rows={[]} myTeamId={null} finished={false} />;

  const rows = await getLeaderboard(challenge.id);
  return <LeaderboardView challengeName={challenge.name} rows={rows} myTeamId={team?.id ?? null} finished={challenge.endAt < new Date()} />;
}
