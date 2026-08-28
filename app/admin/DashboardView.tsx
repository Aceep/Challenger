import Link from "next/link";
import { Card, Eyebrow, KyleEmpty, Pill } from "@/components/ui";
import { fmtDelta, fmtPoints } from "@/lib/format";

export type DashboardViewProps = {
  challenge: { name: string; color: string; week: number; weeks: number } | null;
  kpis: { books: number; booksLast7: number; points: number; activePlayers: number; players: number; nextLeaderboard: string; nextIn: string };
  todo: { id: string; tone: "wait" | "ok" | "no"; icon: string; text: string; href?: string }[];
  leaderboard: { teamId: string; name: string; color: string; points: number; rank: number }[];
  bot: { lastTickLabel: string; cron: string };
  recentBooks: {
    id: string;
    when: string;
    who: string;
    title: string;
    type: "ROMAN" | "GRAPHIQUE" | null;
    points: number;
    links: string;
    deleted: boolean;
  }[];
  demo?: boolean;
};

/** Admin dashboard — pure view, reused by /demo/admin. */
export function DashboardView({ challenge, kpis, todo, leaderboard, bot, recentBooks, demo }: DashboardViewProps) {
  const p = (path: string) => (demo ? `/demo${path}` : path);

  return (
    <>
      <div className="topline">
        <h1>Tableau de bord</h1>
        {challenge ? (
          <span className="ed" style={{ background: challenge.color }}>
            {challenge.name} · semaine {challenge.week} / {challenge.weeks}
          </span>
        ) : (
          <span className="flash warn">
            Aucun défi actif.{" "}
            <Link href={p("/admin/challenge")} className="underline">
              Créer ou activer un défi
            </Link>
          </span>
        )}
      </div>

      <div className="kpis">
        <Card className="kpi">
          <p className="v num">{kpis.books}</p>
          <p className="l">
            lectures déclarées · {fmtDelta(kpis.booksLast7)} cette semaine
          </p>
        </Card>
        <Card className="kpi">
          <p className="v num">{fmtPoints(kpis.points)}</p>
          <p className="l">points distribués</p>
        </Card>
        <Card className="kpi">
          <p className="v num">
            {kpis.activePlayers} / {kpis.players}
          </p>
          <p className="l">joueurs actifs sur 7 jours</p>
        </Card>
        <Card className="kpi">
          <p className="v num">{kpis.nextLeaderboard}</p>
          <p className="l">prochain classement · {kpis.nextIn}</p>
        </Card>
      </div>

      <div className="two">
        <Card className="flex flex-col gap-2.5">
          <Eyebrow>À traiter</Eyebrow>
          {todo.length === 0 ? (
            <KyleEmpty card={false}>Rien à traiter : Kyle se repose.</KyleEmpty>
          ) : (
            todo.map((t) => (
              <div key={t.id} className={`alert ${t.tone === "ok" ? "ok" : t.tone === "no" ? "no" : ""}`}>
                <span aria-hidden>{t.icon}</span>
                <span>
                  {t.text}{" "}
                  {t.href && (
                    <Link href={p(t.href)} className="underline">
                      Voir
                    </Link>
                  )}
                </span>
              </div>
            ))
          )}
        </Card>

        <Card className="flex flex-col gap-2.5">
          <Eyebrow>Classement en direct</Eyebrow>
          <table className="data-table">
            <tbody>
              {leaderboard.map((r) => (
                <tr key={r.teamId}>
                  <td>
                    <span className="dot" style={{ background: r.color }} />
                    {r.name}
                    {leaderboard.filter((o) => o.rank === r.rank).length > 1 && <Pill tone="type">ex æquo</Pill>}
                  </td>
                  <td className="num text-right font-extrabold">{fmtPoints(r.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Eyebrow>Bot Discord</Eyebrow>
          <p className="text-[13px] text-[color:var(--muted)]">
            {bot.lastTickLabel} · {bot.cron}
          </p>
        </Card>
      </div>

      <Card>
        <Eyebrow>Dernières lectures</Eyebrow>
        <table className="data-table">
          <thead>
            <tr>
              <th>Quand</th>
              <th>Qui</th>
              <th>Lecture</th>
              <th>Type</th>
              <th className="text-right">Points</th>
              <th>Liens</th>
            </tr>
          </thead>
          <tbody>
            {recentBooks.map((b) => (
              <tr key={b.id}>
                <td className="num">{b.when}</td>
                <td>{b.who}</td>
                <td>{b.deleted ? <s>{b.title}</s> : b.title}</td>
                <td>{b.type && <Pill tone="type">{b.type === "ROMAN" ? "roman" : "graphique"}</Pill>}</td>
                <td className="num text-right font-extrabold" style={b.deleted ? { color: "var(--brick)" } : undefined}>
                  {fmtPoints(b.points)}
                </td>
                <td>{b.links || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
