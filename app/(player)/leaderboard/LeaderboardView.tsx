import { KyleEmpty, Meta, PageTitle, Pill, RankRow } from "@/components/ui";
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

/** Leaderboard — pure view, reused by /demo. */
export function LeaderboardView({ challengeName, rows, myTeamId, finished, demo }: LeaderboardViewProps) {
  if (!challengeName) {
    return (
      <main className="flex flex-1 flex-col gap-5 p-5">
        <PageTitle>Classement</PageTitle>
        <KyleEmpty>Aucun défi actif pour le moment.</KyleEmpty>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      {!demo && <LiveRefresh seconds={20} />}
      <PageTitle
        kicker={
          <p className="meta">
            <span className="accent">{challengeName}</span> · publié chaque dimanche 20 h
          </p>
        }
      >
        {finished ? "Classement final" : "Classement"}
      </PageTitle>

      {finished && rows[0] && (
        <section className="card raised flex flex-col items-center gap-2 text-center" style={{ background: "var(--hi)" }}>
          <Pill stamp tone="me">
            Vainqueur
          </Pill>
          <p className="font-display text-3xl font-bold">{rows[0].name}</p>
          <Meta>
            {fmtPoints(rows[0].points)} pts · {rows[0].books} romans
          </Meta>
        </section>
      )}

      <ol className="list">
        {rows.map((r) => (
          <RankRow
            key={r.teamId}
            rank={r.rank}
            name={r.name}
            color={r.color}
            points={r.points}
            me={r.teamId === myTeamId}
            tie={rows.filter((o) => o.rank === r.rank).length > 1}
            sub={`${r.members} membre${r.members > 1 ? "s" : ""} · ${r.books} roman${r.books > 1 ? "s" : ""} · ${r.graphics} graphique${r.graphics > 1 ? "s" : ""}`}
          />
        ))}
      </ol>

      <p className="meta-xs">
        Une case ou une quête « en attente » ne rapporte rien tant qu’elle n’est pas complétée : une lecture du samedi peut compter au classement suivant.
      </p>
    </main>
  );
}
