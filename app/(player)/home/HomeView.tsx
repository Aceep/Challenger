import Link from "next/link";
import { Button, Card, KyleEmpty, PageTitle, ScoreCard, Stat } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { BooksIcon, FlagIcon, LogoutIcon, PlusIcon, QuestIcon, SearchIcon, TargetIcon, VoteIcon } from "@/components/ui/icons";
import { fmtPoints } from "@/lib/format";
import { dayLabel, type WeekAction } from "@/lib/home/week";

export type HomeViewProps = {
  userName: string;
  team: { name: string; color: string } | null;
  challengeName: string | null;
  /** The challenge is over: scores are frozen. */
  challengeOver: boolean;
  score: number;
  rank: { position: number; total: number; gapPoints: number; ahead: string } | null;
  stats: { romans: number; graphiques: number; myPoints: number; teamShare: number | null };
  /**
   * "Cette semaine" bullets — the playing week, from Sunday 21 h (the
   * verification window closes) to the next Sunday 19 h (it opens again).
   */
  week: {
    /** What the player did since the week opened, newest first. */
    actions: WeekAction[];
    vote: { chapter: string; deadline: Date; voted: boolean; tie: boolean } | null;
    pendingCells: { label: string; missing: string }[];
  };
  /** `?ok=` / `?error=` — where switching edition lands its confirmation. */
  params?: Record<string, string | string[] | undefined>;
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

const ACTION_ICON = { book: BooksIcon, cell: TargetIcon, quest: QuestIcon };

/** One line of the week's recap: what was done, and which day. */
function ActionLine({ action, now }: { action: WeekAction; now: Date }) {
  const Icon = ACTION_ICON[action.kind];
  return (
    <li>
      <Icon className="ico" />
      <p>
        {action.kind === "book" && (
          <>
            <strong>Lecture inscrite</strong> — «&#8239;{action.title}&#8239;», +{fmtPoints(action.points)} pts
          </>
        )}
        {action.kind === "cell" && (
          <>
            <strong>Case {action.label} remplie</strong> — «&#8239;{action.title}&#8239;»
          </>
        )}
        {action.kind === "quest" && (
          <>
            <strong>Quête #{action.number} terminée</strong> — {action.title}
          </>
        )}{" "}
        <span className="when">{dayLabel(action.at, now)}</span>
      </p>
    </li>
  );
}

/** Player home screen — pure view, reused by /demo. */
export function HomeView({ userName, team, challengeName, challengeOver, score, rank, stats, week, params, demo, signOutAction }: HomeViewProps) {
  const p = (path: string) => (demo ? `/demo${path}` : path);
  const now = new Date();
  const readings = stats.romans + stats.graphiques;

  return (
    <main className="home flex flex-1 flex-col gap-6 p-5">
      {params && <Flash params={params} />}
      <PageTitle
        className="page-head"
        kicker={challengeName ? <p className="eyebrow">{challengeName}</p> : undefined}
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

      {challengeName === null ? (
        <>
          <KyleEmpty
            action={
              <Button href="/new" size="lg">
                Crée ton défi
              </Button>
            }
          >
            Tu n’as pas encore de défi.
          </KyleEmpty>
          <p className="meta">
            ou rejoins un défi : sur le serveur Discord de ton défi, tape <code>/challenger rejoindre</code>. Une invitation reçue s’applique à ta
            prochaine connexion.
          </p>
        </>
      ) : (
        <>
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
                  {week.vote.tie ? (
                    <>
                      <strong>Égalité sur le vote</strong> — «&#8239;{week.vote.chapter}&#8239;», au capitaine de trancher
                    </>
                  ) : week.vote.voted ? (
                    <>
                      <strong>Ton vote est enregistré</strong> — «&#8239;{week.vote.chapter}&#8239;», {remaining(week.vote.deadline, now)}
                    </>
                  ) : (
                    <>
                      <strong>Tu n’as pas encore voté</strong> — «&#8239;{week.vote.chapter}&#8239;», {remaining(week.vote.deadline, now)}
                    </>
                  )}{" "}
                  · <Link href={p("/story")}>{week.vote.voted || week.vote.tie ? "revoir" : "voter"}</Link>
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
            {week.actions.length > 0 ? (
              week.actions.map((a) => (
                <ActionLine key={`${a.kind}-${a.at.getTime()}-${a.kind === "book" ? a.title : a.kind === "cell" ? a.label : a.number}`} action={a} now={now} />
              ))
            ) : (
              <li>
                <BooksIcon className="ico" />
                <p>
                  <strong>Rien d’inscrit cette semaine</strong> — elle a commencé dimanche à 21 h.
                </p>
              </li>
            )}
            <li>
              <SearchIcon className="ico" />
              <p>
                <strong>Vérification dimanche 19 h – 21 h</strong> — classement à 20 h
              </p>
            </li>
          </ul>
        </Card>
        </>
      )}
    </main>
  );
}
