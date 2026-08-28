import { Button, Card, Eyebrow, KyleEmpty, Pill, ProgressBar } from "@/components/ui";

export type QuestRow = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  points: number;
  openAt: Date | null;
  closeAt: Date | null;
  open: boolean;
  done: boolean;
  /** 0, 0.5 (a graphic waiting for its other half) or 1. */
  progress: number;
  fromStory: boolean;
  forMyTeam: boolean;
  linkedBooks: { id: string; title: string; type: "ROMAN" | "GRAPHIQUE"; owner: string }[];
};

export type QuestsViewProps = {
  quests: QuestRow[];
  hasChallenge: boolean;
  hasTeam: boolean;
  teamColor: string;
  demo?: boolean;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function QuestCard({ q, teamColor, prefix, canAdd }: { q: QuestRow; teamColor: string; prefix: string; canAdd: boolean }) {
  const style = q.fromStory ? { border: `1.5px solid ${teamColor}` } : undefined;
  return (
    <li>
      <Card className={`quest ${q.open ? "" : "opacity-70"}`} style={style}>
        <div className="head">
          <p className="n">
            <span className="no">#{q.number}</span>
            {q.title}
          </p>
          {q.done ? (
            <Pill tone="ok">validée</Pill>
          ) : q.fromStory ? (
            <Pill tone="no">imposée par l&apos;histoire</Pill>
          ) : !q.open && q.openAt ? (
            <Pill tone="type">ouvre le {dateFmt.format(q.openAt)}</Pill>
          ) : canAdd ? (
            <Button href={`${prefix}/books/new`} small>
              + Lecture
            </Button>
          ) : null}
        </div>
        {q.open && <ProgressBar ratio={q.progress} half={q.progress > 0 && q.progress < 1} />}
        {q.linkedBooks.length > 0 ? (
          <p className={`text-xs font-bold ${q.done ? "text-[color:var(--olive)]" : "text-[color:var(--muted)]"}`}>
            {q.linkedBooks.map((b) => `${b.owner} — ${b.title}${b.type === "GRAPHIQUE" ? " (½)" : ""}`).join(" / ")}
            {q.done ? ` · +${q.points} pts` : " · en attente de la seconde moitié"}
          </p>
        ) : (
          <p className="text-xs text-[color:var(--muted)]">
            {q.points} pts
            {q.forMyTeam && " · spéciale pour ton équipe"}
            {q.closeAt && ` · jusqu'au ${dateFmt.format(q.closeAt)}`}
            {q.open && " · se valide avec un roman, ou deux graphiques"}
          </p>
        )}
        {q.description && <p className="whitespace-pre-line text-sm text-[color:var(--muted)]">{q.description}</p>}
      </Card>
    </li>
  );
}

/** Quests screen — pure view, reused by /demo. */
export function QuestsView({ quests, hasChallenge, hasTeam, teamColor, demo }: QuestsViewProps) {
  const prefix = demo ? "/demo" : "";
  const open = quests.filter((q) => q.open);
  const closed = quests.filter((q) => !q.open);

  return (
    <main className="flex flex-1 flex-col gap-5 p-5">
      <h1>Quêtes</h1>
      <div data-tour="quests-list">
        {!hasChallenge ? (
          <KyleEmpty>Aucun défi actif.</KyleEmpty>
        ) : open.length === 0 ? (
          <KyleEmpty>Aucune quête ouverte pour le moment.</KyleEmpty>
        ) : (
          <ul className="list">
            {open.map((q) => (
              <QuestCard key={q.id} q={q} teamColor={teamColor} prefix={prefix} canAdd={hasTeam && !q.done} />
            ))}
          </ul>
        )}
      </div>

      {closed.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <Eyebrow>Fermées / à venir</Eyebrow>
          <ul className="list">
            {closed.map((q) => (
              <QuestCard key={q.id} q={q} teamColor={teamColor} prefix={prefix} canAdd={false} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
