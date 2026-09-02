import Link from "next/link";
import { Card, KyleEmpty, Pill, ProgressBar } from "@/components/ui";
import { DataTable } from "@/components/ui/DataTable";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import type { ActionState } from "@/lib/forms";
import type { QuestFormValues } from "./QuestForm";
import { QuestModal } from "./QuestModal";

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
  /** Per team id: "done" (✅) or "half" (½). Teams absent are not started. */
  progress: { teamId: string; team: string; state: "done" | "half" }[];
};

export type QuestsAdminViewProps = {
  quests: AdminQuestRow[];
  teams: { id: string; name: string }[];
  hasChallenge: boolean;
  editingId: string | null;
  /** `?new=1` opens the creation modal. */
  creating: boolean;
  /** Number the next quest will get. */
  nextNumber: number;
  params: Record<string, string | string[] | undefined>;
  /** Team whose progress is detailed (`?team=<id>`), with `?quest=<id>` focusing one quest. */
  teamProgress: TeamQuestProgress | null;
  selectedQuestId: string | null;
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
  creating,
  nextNumber,
  params,
  teamProgress,
  selectedQuestId,
  demo,
  saveQuestAction,
  deleteQuestAction,
  attachQuestBookAction,
  detachQuestBookAction,
}: QuestsAdminViewProps) {
  const base = demo ? "/demo/admin/quests" : "/admin/quests";
  const editing = quests.find((q) => q.id === editingId);
  const focusedQuest = teamProgress?.quests.find((q) => q.id === selectedQuestId) ?? null;

  return (
    <>
      <div className="topline">
        <h1>Quêtes</h1>
        <span className="text-[13.5px] text-[color:var(--muted)]">Collectives : une équipe valide une quête avec un roman, ou deux graphiques.</span>
        {hasChallenge && (
          <Link href={`${base}?new=1`} className="btn small ml-auto">
            + Nouvelle quête
          </Link>
        )}
      </div>
      <Flash params={params} />

      {!hasChallenge ? (
        <KyleEmpty>Active un défi pour créer des quêtes.</KyleEmpty>
      ) : (
        <>
          <Card>
            <DataTable
              head={[
                "N°",
                "Quête",
                { label: "Points", className: "text-right" },
                "Fenêtre",
                "Cible",
                ...teams.map((t) => ({ label: t.name, className: "text-center" })),
                "",
              ]}
            >
              {quests.map((q) => (
                /* `current` marks the quest detailed below, so the highlight says
                   which one is open instead of merely following the cursor. */
                <tr key={q.id} className={focusedQuest?.id === q.id ? "current" : undefined}>
                  <td className="num">#{q.number}</td>
                  <td>
                    <strong>{q.title}</strong> {q.fromStory && <Pill tone="no">issue de l&apos;histoire</Pill>}
                  </td>
                  <td className="num text-right">{q.points}</td>
                  <td>{q.window}</td>
                  <td>{q.target}</td>
                  {teams.map((t) => {
                    const st = q.progress.find((p) => p.teamId === t.id)?.state ?? "none";
                    const focused = teamProgress?.teamId === t.id && selectedQuestId === q.id;
                    return (
                      <td key={t.id} className="matrix text-center">
                        <Link
                          href={`${base}?team=${t.id}&quest=${q.id}`}
                          scroll={false}
                          className={`progress-cell ${st} ${focused ? "focused" : ""}`}
                          title={`${t.name} — ${st === "done" ? "validée" : st === "half" ? "à moitié (½)" : "pas commencée"} · voir le détail`}
                        >
                          {st === "done" ? "✅" : st === "half" ? "½" : "—"}
                        </Link>
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap">
                    <span className="inline-flex gap-1.5">
                      <Link href={`${base}?edit=${q.id}`} scroll={false} className="icon-btn" title="Modifier" aria-label={`Modifier la quête #${q.number}`}>
                        <PencilIcon />
                      </Link>
                      <form action={deleteQuestAction} className="inline">
                        <input type="hidden" name="questId" value={q.id} />
                        <button className="icon-btn danger" title="Supprimer" aria-label={`Supprimer la quête #${q.number}`}>
                          <TrashIcon />
                        </button>
                      </form>
                    </span>
                  </td>
                </tr>
              ))}
            </DataTable>
          </Card>

          <p className="text-[13px] text-[color:var(--muted)]">
            ✅ validée · ½ une moitié posée · — pas commencée. Clique une case pour voir les lectures rattachées et corriger.
          </p>

          {(creating || editing) && <QuestModal quest={editing} nextNumber={nextNumber} teams={teams} base={base} action={saveQuestAction} />}

          {teamProgress && focusedQuest && (
            <section className="flex flex-col gap-3">
              <div className="topline">
                <h2>
                  #{focusedQuest.number} — {focusedQuest.title} · {teamProgress.teamName}
                </h2>
                {focusedQuest.done ? <Pill tone="ok">validée</Pill> : focusedQuest.progress > 0 ? <Pill tone="wait">½ — en attente de la seconde moitié</Pill> : !focusedQuest.open ? <Pill tone="type">fermée</Pill> : <Pill tone="type">pas commencée</Pill>}
                <Link href={base} scroll={false} className="ml-auto text-[13px] underline">
                  Fermer
                </Link>
              </div>
              <Card className="quest" style={{ border: "1.5px solid var(--kyle-deep)" }}>
                <ProgressBar ratio={focusedQuest.progress} half={focusedQuest.progress > 0 && focusedQuest.progress < 1} />
                {focusedQuest.linkedBooks.length > 0 ? (
                  <ul className="flex flex-col gap-1.5 text-[14px]">
                    {focusedQuest.linkedBooks.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {b.owner} — <strong>{b.title}</strong> {b.type === "GRAPHIQUE" && <Pill tone="wait">½</Pill>}
                        </span>
                        <form action={detachQuestBookAction}>
                          <input type="hidden" name="bookId" value={b.id} />
                          <SubmitButton className="btn small danger" pendingLabel="…">
                            Retirer
                          </SubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-[color:var(--muted)]">Aucune lecture rattachée pour {teamProgress.teamName}.</p>
                )}
                {!focusedQuest.done &&
                  (teamProgress.freeBooks.length > 0 ? (
                    <form action={attachQuestBookAction} className="flex flex-wrap items-end gap-2 border-t border-[color:var(--line)] pt-3">
                      <input type="hidden" name="questId" value={focusedQuest.id} />
                      <label className="field min-w-0 flex-1">
                        Rattacher une lecture de {teamProgress.teamName}
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
                        <span className="hint">Seules les lectures sans quête apparaissent. La validation et les points sont recalculés.</span>
                      </label>
                      <SubmitButton className="btn small" pendingLabel="…">
                        Rattacher
                      </SubmitButton>
                    </form>
                  ) : (
                    <p className="text-[13px] text-[color:var(--muted)]">Toutes les lectures de {teamProgress.teamName} sont déjà rattachées à une quête.</p>
                  ))}
              </Card>
            </section>
          )}
        </>
      )}
    </>
  );
}
