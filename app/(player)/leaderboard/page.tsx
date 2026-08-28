import { LiveRefresh } from "@/components/LiveRefresh";
import { getActiveChallenge, getCurrentPlayer } from "@/lib/dal";
import { fmtPoints } from "@/lib/format";
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
  const finished = challenge.endAt < new Date();

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <LiveRefresh seconds={10} />
      <header>
        <h1 className="text-2xl font-bold">{finished ? "Classement final" : "Classement"}</h1>
        <p className="text-sm text-slate-500">{challenge.name}</p>
      </header>
      {finished && rows[0] && (
        <section className="rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 p-5 text-center text-amber-950 shadow">
          <p className="text-sm uppercase tracking-wide">Vainqueur</p>
          <p className="text-3xl font-black">🏆 {rows[0].name}</p>
          <p className="text-sm">{fmtPoints(rows[0].points)} pts · {rows[0].books} romans</p>
        </section>
      )}
      <ol className="flex flex-col gap-2">
        {rows.map((r) => (
          <li
            key={r.teamId}
            className={`flex items-center gap-3 rounded-xl border-l-4 bg-white p-3 shadow-sm dark:bg-slate-900 ${
              r.teamId === team?.id ? "ring-2 ring-indigo-400" : ""
            }`}
            style={{ borderLeftColor: r.color }}
          >
            <span className="w-8 text-center text-xl" title={rows.filter((o) => o.rank === r.rank).length > 1 ? "ex æquo" : undefined}>{MEDALS[r.rank - 1] ?? r.rank}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {r.name}
                {rows.filter((o) => o.rank === r.rank).length > 1 && <span className="ml-1 text-xs font-normal text-slate-500">ex æquo</span>}
              </p>
              <p className="text-xs text-slate-500">
                {r.members} membre{r.members > 1 ? "s" : ""} · {r.books} roman{r.books > 1 ? "s" : ""} · {r.graphics} graphique{r.graphics > 1 ? "s" : ""}
              </p>
            </div>
            <span className="text-lg font-bold">{fmtPoints(r.points)} pts</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
