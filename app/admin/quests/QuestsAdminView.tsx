import Link from "next/link";
import { Card, Eyebrow, KyleEmpty, Pill, ProgressBar } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ActionState } from "@/lib/forms";
import { QuestForm, type QuestFormValues } from "./QuestForm";

/** One team's quest progress, with the readings the admin may attach or detach. */
export type TeamQuestProgress = {
  teamId: string;
  teamName: string;
  quests: {
    id: string;
    number: number;
    title: string;
    points: number;
    open: boolean;
    done: boolean;
    /** 0, 0.5 (a graphique waiting for its other half) or 1. */
    progress: number;
    linkedBooks: { id: string; title: string; type: "ROMAN" | "GRAPHIQUE"; owner: string }[];
  }[];
  /** Readings of the team attached to no quest yet. */
  freeBooks: { id: string; label: string }[];
};

export type AdminQuestRow = QuestFormValues & {
  id: string;
  number: number;
  window: string;
  target: string;
  fromStory: boolean;
  /** Per team: "done" (✅) or "half" (½). */
  progress: { team: string; state: "done" | "half" }[];
};

export type QuestsAdminViewProps = {
  quests: AdminQuestRow[];
  teams: { id: string; name: string }[];
  hasChallenge: boolean;
  editingId: string | null;
  params: Record<string, string | string[] | undefined>;
  /** Team whose progress is shown below the table (`?team=<id>`). */
  teamProgress: TeamQuestProgress | null;
  demo?: boolean;
  saveQuestAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  deleteQuestAction: (formData: FormData) => Promise<void>;
  attachQuestBookAction: (formData: FormData) => Promise<void>;
  detachQuestBookAction: (formData: FormData) => Promise<void>;
};

/** Admin › Quêtes — pure view, reused by /demo/admin. */
export function QuestsAdminView({
  quests,
  teams,
  hasChallenge,
  editingId,
  params,
  teamProgress,
  demo,
  saveQuestAction,
  deleteQuestAction,
  attachQuestBookAction,
  detachQuestBookAction,
}: QuestsAdminViewProps) {
  const base = demo ? "/demo/admin/quests" : "/admin/quests";
  const editing = quests.find((q) => q.id === editingId);

  return (
    <>
      <div className="topline">
        <h1>Quêtes</h1>
        <span className="text-[13.5px] text-[color:var(--muted)]">
          Collectives : une équipe valide une quête avec un roman, ou deux graphiques.
        </span>
      </div>
      <Flash params={params} />

      {!hasChallenge ? (
        <KyleEmpty>Active un défi pour créer des quêtes.</KyleEmpty>
      ) : (
        <>
          <Card>
            <table className="data-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Quête</th>
                  <th className="text-right">Points</th>
                  <th>Fenêtre</th>
                  <th>Cible</th>
                  <th>Validée par</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {quests.map((q) => (
                  <tr key={q.id}>
                    <td className="num">#{q.number}</td>
                    <td>
                      <strong>{q.title}</strong> {q.fromStory && <Pill tone="no">issue de l&apos;histoire</Pill>}
                    </td>
                    <td className="num text-right">{q.points}</td>
                    <td>{q.window}</td>
                    <td>{q.target}</td>
                    <td>
                      {q.progress.length === 0
                        ? "—"
                        : q.progress.map((p) => (
                            <span key={p.team} className="mr-2 whitespace-nowrap">
                              {p.team} {p.state === "done" ? "✅" : <Pill tone="wait">½</Pill>}
                            </span>
                          ))}
                    </td>
                    <td className="whitespace-nowrap">
                      <Link href={`${base}?edit=${q.id}`} className="underline">
                        Modifier
                      </Link>{" "}
                      ·{" "}
                      <form action={deleteQuestAction} className="inline">
                        <input type="hidden" name="questId" value={q.id} />
                        <button className="text-[color:var(--brick)] underline">Supprimer</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {editing ? (
            <QuestForm quest={editing} teams={teams} action={saveQuestAction} closeHref={base} />
          ) : (
            <QuestForm teams={teams} action={saveQuestAction} />
          )}

          <section className="flex flex-col gap-4">
            <div className="topline">
              <h2>Avancement par équipe</h2>
              <span className="text-[13.5px] text-[color:var(--muted)]">
                Rattache ou détache une lecture pour corriger une quête. La validation et les points sont recalculés.
              </span>
            </div>

            <Card>
              <form method="get" action={base} className="flex flex-wrap items-end gap-4">
                <label className="field max-w-xs flex-1">
                  Équipe
                  <select name="team" defaultValue={teamProgress?.teamId ?? ""}>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn small">Afficher l&apos;avancement</button>
              </form>
            </Card>

            {!teamProgress ? (
              <KyleEmpty>Crée une équipe pour suivre ses quêtes.</KyleEmpty>
            ) : teamProgress.quests.length === 0 ? (
              <KyleEmpty>Aucune quête ne concerne {teamProgress.teamName}.</KyleEmpty>
            ) : (
              <ul className="list">
                {teamProgress.quests.map((q) => (
                  <li key={q.id}>
                    <Card className="quest">
                      <div className="head">
                        <p className="n">
                          <span className="no">#{q.number}</span>
                          {q.title}
                        </p>
                        {q.done ? <Pill tone="ok">validée</Pill> : q.progress > 0 ? <Pill tone="wait">½</Pill> : !q.open ? <Pill tone="type">fermée</Pill> : null}
                      </div>
                      <ProgressBar ratio={q.progress} half={q.progress > 0 && q.progress < 1} />
                      {q.linkedBooks.length > 0 ? (
                        <ul className="flex flex-col gap-1 text-[13px]">
                          {q.linkedBooks.map((b) => (
                            <li key={b.id} className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate">
                                {b.owner} — <strong>{b.title}</strong> {b.type === "GRAPHIQUE" && <Pill tone="wait">½</Pill>}
                              </span>
                              <form action={detachQuestBookAction}>
                                <input type="hidden" name="bookId" value={b.id} />
                                <button type="submit" className="text-xs text-[color:var(--brick)] underline">
                                  Retirer
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[color:var(--muted)]">{q.points} pts · aucune lecture rattachée.</p>
                      )}
                      {!q.done && teamProgress.freeBooks.length > 0 && (
                        <form action={attachQuestBookAction} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="questId" value={q.id} />
                          <label className="field min-w-0 flex-1">
                            Rattacher une lecture
                            <select name="bookId" required defaultValue="">
                              <option value="" disabled>
                                Choisir une lecture…
                              </option>
                              {teamProgress.freeBooks.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <SubmitButton className="btn small" pendingLabel="…">
                            Rattacher
                          </SubmitButton>
                        </form>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}

            {teamProgress && teamProgress.freeBooks.length === 0 && (
              <div className="flex flex-col gap-1">
                <Eyebrow>Lectures disponibles</Eyebrow>
                <p className="text-[13px] text-[color:var(--muted)]">
                  Toutes les lectures de {teamProgress.teamName} sont déjà rattachées à une quête.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
