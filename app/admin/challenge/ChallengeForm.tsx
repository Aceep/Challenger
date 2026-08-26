"use client";

import { useActionState } from "react";
import { saveChallengeAction } from "./actions";

type Props = {
  challenge: {
    id: string;
    name: string;
    startAt: string;
    endAt: string;
    pointsPerPage: number;
    bingoLineBonus: number;
    bingoFullBonus: number;
    status: "DRAFT" | "ACTIVE" | "FINISHED";
    discordGuildId: string | null;
    discordGeneralChannelId: string | null;
  } | null;
};

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900";

export function ChallengeForm({ challenge }: Props) {
  const [state, action, pending] = useActionState(saveChallengeAction, null);
  const c = challenge;

  return (
    <form action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
        Nom du défi
        <input name="name" required defaultValue={c?.name ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Début
        <input name="startAt" type="date" required defaultValue={c?.startAt ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Fin
        <input name="endAt" type="date" required defaultValue={c?.endAt ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Points par page
        <input name="pointsPerPage" type="number" step="0.01" min="0.01" defaultValue={c?.pointsPerPage ?? 0.1} className={field} />
        <span className="text-xs font-normal text-slate-500">0,1 = 1 point pour 10 pages</span>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Statut
        <select name="status" defaultValue={c?.status ?? "DRAFT"} className={field}>
          <option value="DRAFT">Brouillon</option>
          <option value="ACTIVE">Actif</option>
          <option value="FINISHED">Terminé</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Bonus ligne de bingo
        <input name="bingoLineBonus" type="number" min="0" defaultValue={c?.bingoLineBonus ?? 25} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Bonus bingo complet
        <input name="bingoFullBonus" type="number" min="0" defaultValue={c?.bingoFullBonus ?? 100} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Discord — id du serveur
        <input name="discordGuildId" defaultValue={c?.discordGuildId ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Discord — id du salon général
        <input name="discordGeneralChannelId" defaultValue={c?.discordGeneralChannelId ?? ""} className={field} />
      </label>

      {state?.error && (
        <p className="rounded-md bg-red-100 p-3 text-sm text-red-800 sm:col-span-2 dark:bg-red-950 dark:text-red-200">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-md bg-green-100 p-3 text-sm text-green-800 sm:col-span-2 dark:bg-green-950 dark:text-green-200">{state.success}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "Enregistrement…" : c ? "Mettre à jour" : "Créer le défi"}
      </button>
    </form>
  );
}
