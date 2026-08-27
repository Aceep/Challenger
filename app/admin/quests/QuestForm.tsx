"use client";

import { useActionState } from "react";
import { saveQuestAction } from "./actions";

export type QuestFormValues = {
  id?: string;
  title: string;
  description: string;
  type: "TEAM" | "INDIVIDUAL";
  kind: "ACTION" | "LECTURE";
  points: number;
  openAt: string;
  closeAt: string;
  targetTeamId: string;
};

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900";

export function QuestForm({ quest, teams, onDone }: { quest?: QuestFormValues; teams: { id: string; name: string }[]; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveQuestAction, null);

  return (
    <form action={action} className="grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 dark:bg-slate-900">
      {quest?.id && <input type="hidden" name="id" value={quest.id} />}
      <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
        Titre
        <input name="title" required defaultValue={quest?.title ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
        Description
        <textarea name="description" rows={3} defaultValue={quest?.description ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Type
        <select name="type" defaultValue={quest?.type ?? "INDIVIDUAL"} className={field}>
          <option value="INDIVIDUAL">Individuelle (chaque joueur·euse)</option>
          <option value="TEAM">Équipe (une fois, validée par le·la capitaine)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Validation
        <select name="kind" defaultValue={quest?.kind ?? "ACTION"} className={field}>
          <option value="ACTION">Action (bouton « Fait ! », sur l&apos;honneur)</option>
          <option value="LECTURE">Lecture (en rattachant un livre, ou deux graphiques)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Points
        <input name="points" type="number" min={0} required defaultValue={quest?.points ?? 20} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Ouvre le (optionnel)
        <input name="openAt" type="datetime-local" defaultValue={quest?.openAt ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Ferme le (optionnel)
        <input name="closeAt" type="datetime-local" defaultValue={quest?.closeAt ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
        Réservée à une équipe (optionnel)
        <select name="targetTeamId" defaultValue={quest?.targetTeamId ?? ""} className={field}>
          <option value="">— toutes les équipes —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {state?.error && <p className="text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700 sm:col-span-2">{state.success}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
          {pending ? "…" : quest?.id ? "Mettre à jour" : "Créer la quête"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="rounded-lg px-3 py-2 text-slate-500">
            Fermer
          </button>
        )}
      </div>
    </form>
  );
}
