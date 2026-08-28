"use client";

import { useActionState } from "react";
import { createTeamAction } from "./actions";

const field =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900";

export function TeamForm() {
  const [state, action, pending] = useActionState(createTeamAction, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nom
        <input name="name" required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Couleur
        <input name="color" type="color" defaultValue="#6366f1" className="h-10 w-16 cursor-pointer rounded" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Salon aventure (id)
        <input name="discordChannelId" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Salon librairie (id)
        <input name="discordLibraryChannelId" className={field} />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
        {pending ? "…" : "Créer l'équipe"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-700">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-green-700">{state.success}</p>}
    </form>
  );
}
