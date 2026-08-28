import Link from "next/link";
import { Button, Card, KyleEmpty, PageTitle, ScoreCard, Stat } from "@/components/ui";
import { FlagIcon, LogoutIcon, PlusIcon, SearchIcon, TargetIcon, VoteIcon } from "@/components/ui/icons";
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

/** « Les Hérissons » → « des Hérissons », « Kyle » → « de Kyle ». */
const ofTeam = (name: string) => (/^les\s/i.test(name) ? `des ${name.slice(4)}` : `de ${name}`);

function remaining(deadline: Date, now: Date) {
  const h = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 3_600_000));
  if (h < 1) return "clos dans moins d’une heure";
  if (h < 48) return `clos dans ${h} h`;
  return `clos dans ${Math.round(h / 24)} jours`;
}

/** Player home screen — pure view, reused by /demo. */
export function HomeView({ userName, team, challengeName, challengeOver, score, rank, stats, week, demo, signOutAction }: HomeViewProps) {
  const p = (path: string) => (demo ? `/demo${path}` : path);
  const now = new Date();
  const readings = stats.romans + stats.graphiques;

  return (
    <main className="home flex flex-1 flex-col gap-6 p-5">
      <PageTitle
        className="page-head"
        action={
          signOutAction ? (
            <form action={signOutAction}>
              <button className="btn sm ghost">
                <LogoutIcon />
                Déconnexion
              </button>
            </form>
          ) : undefined
        }
      >
        Salut <span className="accent">{userName}</span>
      </PageTitle>

      {challengeOver && (
        <p className="flash warn">
          <FlagIcon />
          Le défi est terminé : les scores sont figés. Merci d’avoir joué !
        </p>
      )}

      {team && challengeName ? (
        <ScoreCard
          data-tour="home-score"
          teamName={team.name}
          teamColor={team.color}
          challengeName={challengeName}
          points={score}
          href={p("/team")}
          rankLine={
            rank ? (
              rank.gapPoints > 0 ? (
                <>
                  {ORDINAL(rank.position)} sur {rank.total} · à <strong>{fmtPoints(rank.gapPoints)} pts</strong> {ofTeam(rank.ahead)}
                </>
              ) : (
                <>
                  {ORDINAL(rank.position)} sur {rank.total} · en tête
                </>
              )
            ) : null
          }
        />
      ) : (
        <KyleEmpty>Tu n’as pas encore d’équipe. Un organisateur va t’en attribuer une.</KyleEmpty>
      )}

      <div className="stat2">
        <Stat
          label="Mes lectures"
          value={readings}
          hint={
            <>
              {stats.romans} roman{stats.romans > 1 ? "s" : ""} · {stats.graphiques} graphique{stats.graphiques > 1 ? "s" : ""}
            </>
          }
        />
        <Stat
          label="Mes points"
          value={fmtPoints(stats.myPoints)}
          hint={stats.teamShare !== null ? `${stats.teamShare} % de l’équipe` : undefined}
        />
      </div>

      <Button href={p("/books/new")} size="lg" className="cta" data-tour="home-add">
        <PlusIcon />
        J’ai fini une lecture
      </Button>

      <Card className="week flex flex-col gap-3.5">
        <h2>Cette semaine</h2>
        <ul className="agenda">
          {week.vote && (
            <li>
              <VoteIcon className="ico" />
              <p>
                <strong>Vote en cours</strong> — {week.vote.chapter}, {remaining(week.vote.deadline, now)} ·{" "}
                <Link href={p("/story")}>voter</Link>
              </p>
            </li>
          )}
          {week.pendingCells.map((c) => (
            <li key={c.label}>
              <TargetIcon className="ico" />
              <p>
                <strong>Case {c.label} en attente</strong> — {c.missing} · <Link href={p("/bingo")}>voir</Link>
              </p>
            </li>
          ))}
          <li>
            <SearchIcon className="ico" />
            <p>
              <strong>Vérification dimanche 19 h – 21 h</strong> — classement à 20 h
            </p>
          </li>
        </ul>
      </Card>
    </main>
  );
}
