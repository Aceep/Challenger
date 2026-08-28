import Link from "next/link";
import { Card, KyleEmpty, Pill } from "@/components/ui";
import { Flash } from "@/components/Flash";
import type { ActionState } from "@/lib/forms";
import { QuestForm, type QuestFormValues } from "./QuestForm";

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
  demo?: boolean;
  saveQuestAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  deleteQuestAction: (formData: FormData) => Promise<void>;
};

/** Admin › Quêtes — pure view, reused by /demo/admin. */
export function QuestsAdminView({ quests, teams, hasChallenge, editingId, params, demo, saveQuestAction, deleteQuestAction }: QuestsAdminViewProps) {
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
        </>
      )}
    </>
  );
}
