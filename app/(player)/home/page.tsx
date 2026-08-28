import { signOut } from "@/auth";
import { getCurrentPlayer } from "@/lib/dal";
import { getTeamBoard } from "@/lib/services/bingo";
import { listBooks } from "@/lib/services/books";
import { getLeaderboard, getTeamScore } from "@/lib/services/leaderboard";
import { getTeamStoryView } from "@/lib/services/story";
import { HomeView } from "./HomeView";

export default async function HomePage() {
  const { user, team } = await getCurrentPlayer();
  const actor = { id: user.id, role: user.role, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id };

  const [score, books, rows, story, board] = await Promise.all([
    team ? getTeamScore(team.id) : Promise.resolve(0),
    listBooks(user.id, actor),
    team ? getLeaderboard(team.challengeId) : Promise.resolve([]),
    team ? getTeamStoryView(team.id, user.id) : Promise.resolve(null),
    team ? getTeamBoard(team.id) : Promise.resolve(null),
  ]);

  const myPoints = books.reduce((n, b) => n + b.points, 0);
  const graphiques = books.filter((b) => b.type === "GRAPHIQUE").length;
  const me = rows.findIndex((r) => r.teamId === team?.id);
  const ahead = me > 0 ? rows[me - 1] : null;

  const vote = story?.vote?.status === "OPEN" ? { chapter: story.node.title, deadline: story.vote.deadline } : null;
  const pendingCells = (board?.grid?.cells ?? [])
    .filter((c) => !c.complete && c.weight > 0)
    .slice(0, 2)
    .map((c) => ({ label: c.label, missing: "il manque ½ graphique (ou un roman)" }));

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
      stats={{
        romans: books.length - graphiques,
        graphiques,
        myPoints,
        teamShare: score > 0 ? Math.round((myPoints / score) * 100) : null,
      }}
      week={{ vote, pendingCells }}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    />
  );
}
