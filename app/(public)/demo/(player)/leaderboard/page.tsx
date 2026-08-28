import { LeaderboardView } from "@/app/(player)/leaderboard/LeaderboardView";
import { DEMO_CHALLENGE, DEMO_LEADERBOARD, DEMO_TEAM } from "@/lib/demo/data";

export default function DemoLeaderboardPage() {
  return <LeaderboardView challengeName={DEMO_CHALLENGE.name} rows={DEMO_LEADERBOARD} myTeamId={DEMO_TEAM.id} finished={false} demo />;
}
