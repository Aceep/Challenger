"use client";

import { useState } from "react";
import { deleteQuestAction } from "./actions";
import { QuestForm, type QuestFormValues } from "./QuestForm";

type Row = QuestFormValues & { id: string; targetTeamName: string | null; completions: number; origin: "ADMIN" | "STORY" };

export function QuestList({ quests, teams }: { quests: Row[]; teams: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-3">
      {quests.map((q) =>
        editing === q.id ? (
          <li key={q.id}>
            <QuestForm quest={q} teams={teams} onDone={() => setEditing(null)} />
          </li>
        ) : (
          <li key={q.id} className="flex items-start justify-between gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="min-w-0">
              <p className="font-semibold">{q.title}</p>
              <p className="text-xs text-slate-500">
                {q.type === "TEAM" ? "Équipe" : "Individuelle"} · {q.kind === "LECTURE" ? "📖 lecture" : "🎯 action"} · {q.points} pts
                {q.targetTeamName && ` · réservée à ${q.targetTeamName}`}
                {q.closeAt && ` · ferme le ${q.closeAt.replace("T", " ")}`}
                {q.origin === "STORY" && " · issue de l'histoire"} · {q.completions} validation{q.completions > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              <button type="button" onClick={() => setEditing(q.id)} className="underline">
                Modifier
              </button>
              <form action={deleteQuestAction}>
                <input type="hidden" name="questId" value={q.id} />
                <button className="text-red-600 underline">Supprimer</button>
              </form>
            </div>
          </li>
        ),
      )}
    </ul>
  );
}
