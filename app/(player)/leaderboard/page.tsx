import { LiveRefresh } from "@/components/LiveRefresh";
import { getActiveChallenge, getCurrentPlayer } from "@/lib/dal";
import { getLeaderboard } from "@/lib/services/leaderboard";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const { team } = await getCurrentPlayer();
  const challenge = team?.challenge ?? (await getActiveChallenge());

  if (!challenge) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1 className="text-2xl font-bold">Classement</h1>
        <p className="text-slate-500">Aucun défi actif pour le moment.</p>
      </main>
    );
  }

  const rows = await getLeaderboard(challenge.id);

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <LiveRefresh seconds={10} />
      <header>
        <h1 className="text-2xl font-bold">Classement</h1>
        <p className="text-sm text-slate-500">{challenge.name}</p>
      </header>
      <ol className="flex flex-col gap-2">
        {rows.map((r) => (
          <li
            key={r.teamId}
            className={`flex items-center gap-3 rounded-xl border-l-4 bg-white p-3 shadow-sm dark:bg-slate-900 ${
              r.teamId === team?.id ? "ring-2 ring-indigo-400" : ""
            }`}
            style={{ borderLeftColor: r.color }}
          >
            <span className="w-8 text-center text-xl">{MEDALS[r.rank - 1] ?? r.rank}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.name}</p>
              <p className="text-xs text-slate-500">
                {r.members} membre{r.members > 1 ? "s" : ""} · {r.books} livre{r.books > 1 ? "s" : ""}
              </p>
            </div>
            <span className="text-lg font-bold">{r.points} pts</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
