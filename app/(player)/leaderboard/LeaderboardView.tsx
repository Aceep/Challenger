import { KyleEmpty, RankRow } from "@/components/ui";
import { LiveRefresh } from "@/components/LiveRefresh";
import { fmtPoints } from "@/lib/format";

export type LeaderboardRowView = {
  teamId: string;
  name: string;
  color: string;
  points: number;
  members: number;
  books: number;
  graphics: number;
  rank: number;
};

export type LeaderboardViewProps = {
  challengeName: string | null;
  rows: LeaderboardRowView[];
  myTeamId: string | null;
  finished: boolean;
  demo?: boolean;
};

const MEDALS = ["🥇", "🥈", "🥉"];

/** Leaderboard — pure view, reused by /demo. */
export function LeaderboardView({ challengeName, rows, myTeamId, finished, demo }: LeaderboardViewProps) {
  if (!challengeName) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1>Classement</h1>
        <KyleEmpty>Aucun défi actif pour le moment.</KyleEmpty>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-3 p-5">
      {!demo && <LiveRefresh seconds={20} />}
      <header>
        <h1>{finished ? "Classement final" : "Classement"}</h1>
        <p className="text-[13px] text-[color:var(--muted)]">{challengeName} · publié chaque dimanche 20 h</p>
      </header>

      {finished && rows[0] && (
        <section className="card text-center" style={{ background: "var(--hi)" }}>
          <p className="eyebrow">Vainqueur</p>
          <p className="font-display text-3xl font-black">🏆 {rows[0].name}</p>
          <p className="text-sm">
            {fmtPoints(rows[0].points)} pts · {rows[0].books} romans
          </p>
        </section>
      )}

      <ol className="list" data-tour="leaderboard-list">
        {rows.map((r) => (
          <RankRow
            key={r.teamId}
            medal={MEDALS[r.rank - 1] ?? r.rank}
            name={r.name}
            color={r.color}
            points={r.points}
            me={r.teamId === myTeamId}
            tie={rows.filter((o) => o.rank === r.rank).length > 1}
            sub={`${r.members} membre${r.members > 1 ? "s" : ""} · ${r.books} roman${r.books > 1 ? "s" : ""} · ${r.graphics} graphique${r.graphics > 1 ? "s" : ""}`}
          />
        ))}
      </ol>

      <p className="text-xs text-[color:var(--muted)]">
        Une case ou une quête « en attente » ne rapporte rien tant qu&apos;elle n&apos;est pas complétée : une lecture du samedi peut compter au classement
        suivant.
      </p>
    </main>
  );
}
