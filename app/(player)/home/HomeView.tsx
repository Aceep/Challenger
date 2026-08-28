import Link from "next/link";
import { Button, Card, Eyebrow, KyleEmpty, ScoreCard } from "@/components/ui";
import { fmtPoints } from "@/lib/format";

export type HomeViewProps = {
  userName: string;
  team: { name: string; color: string } | null;
  challengeName: string | null;
  /** The challenge is over: scores are frozen. */
  challengeOver: boolean;
  score: number;
  rank: { position: number; total: number; gapPoints: number; ahead: string } | null;
  stats: { romans: number; graphiques: number; myPoints: number; teamShare: number | null };
  /** "Cette semaine" bullets. */
  week: {
    vote: { chapter: string; deadline: Date } | null;
    pendingCells: { label: string; missing: string }[];
  };
  demo?: boolean;
  /** Real app only: the sign-out Server Action. */
  signOutAction?: () => Promise<void>;
};

const ORDINAL = (n: number) => (n === 1 ? "1ᵉʳ" : `${n}ᵉ`);

/** « Les Hérissons » → « des Hérissons », « Kyle » → « de Kyle ». */
const ofTeam = (name: string) => (/^les\s/i.test(name) ? `des ${name.slice(4)}` : `de ${name}`);

function remaining(deadline: Date, now: Date) {
  const h = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 3_600_000));
  if (h < 1) return "clos dans moins d'une heure";
  if (h < 48) return `clos dans ${h} h`;
  return `clos dans ${Math.round(h / 24)} jours`;
}

/** Player home screen — pure view, reused by /demo. */
export function HomeView({ userName, team, challengeName, challengeOver, score, rank, stats, week, demo, signOutAction }: HomeViewProps) {
  const p = (path: string) => (demo ? `/demo${path}` : path);
  const now = new Date();

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h1>Salut {userName} 👋</h1>
        {signOutAction ? (
          <form action={signOutAction}>
            <button className="text-xs text-[color:var(--muted)]">Déconnexion</button>
          </form>
        ) : null}
      </div>

      {challengeOver && <p className="flash warn">🏁 Le défi est terminé : les scores sont figés. Merci d&apos;avoir joué !</p>}

      {team && challengeName ? (
        <ScoreCard
          teamName={team.name}
          teamColor={team.color}
          challengeName={challengeName}
          points={score}
          href={p("/team")}
          rankLine={
            rank
              ? rank.gapPoints > 0
                ? `${ORDINAL(rank.position)} sur ${rank.total} · à ${fmtPoints(rank.gapPoints)} pts ${ofTeam(rank.ahead)}`
                : `${ORDINAL(rank.position)} sur ${rank.total} · en tête`
              : null
          }
        />
      ) : (
        <KyleEmpty>Tu n&apos;as pas encore d&apos;équipe. Un organisateur va t&apos;en attribuer une.</KyleEmpty>
      )}

      <div className="stat2">
        <Card className="px-3.5 py-3">
          <Eyebrow>Mes lectures</Eyebrow>
          <p className="v num">{stats.romans + stats.graphiques}</p>
          <p className="text-xs text-[color:var(--muted)]">
            {stats.romans} roman{stats.romans > 1 ? "s" : ""} · {stats.graphiques} graphique{stats.graphiques > 1 ? "s" : ""}
          </p>
        </Card>
        <Card className="px-3.5 py-3">
          <Eyebrow>Mes points</Eyebrow>
          <p className="v num">{fmtPoints(stats.myPoints)}</p>
          {stats.teamShare !== null && <p className="text-xs text-[color:var(--muted)]">{stats.teamShare} % de l&apos;équipe</p>}
        </Card>
      </div>

      <Button href={p("/books/new")} className="text-[17px]" style={{ padding: 14 }}>
        + J&apos;ai fini une lecture
      </Button>

      <Card className="flex flex-col gap-2">
        <Eyebrow>Cette semaine</Eyebrow>
        {week.vote && (
          <p>
            🗳️ <strong>Vote en cours</strong> — {week.vote.chapter}, {remaining(week.vote.deadline, now)} ·{" "}
            <Link href={p("/story")} className="underline">
              voter
            </Link>
          </p>
        )}
        {week.pendingCells.map((c) => (
          <p key={c.label}>
            🎯 <strong>Case {c.label} en attente</strong> — {c.missing} ·{" "}
            <Link href={p("/bingo")} className="underline">
              voir
            </Link>
          </p>
        ))}
        <p>
          🔍 <strong>Vérification dimanche 19 h – 21 h</strong> — classement à 20 h
        </p>
      </Card>

    </main>
  );
}
