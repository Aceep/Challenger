"use client";

import { useActionState } from "react";
import { createInviteAction } from "./actions";

const field =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900";

export function InviteForm({ teams }: { teams: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createInviteAction, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Identifiant Discord
        <input name="discordId" required inputMode="numeric" placeholder="123456789012345678" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Équipe
        <select name="teamId" className={field} defaultValue="">
          <option value="">— plus tard —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Rôle
        <select name="role" className={field} defaultValue="PLAYER">
          <option value="PLAYER">Joueur·euse</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
        {pending ? "…" : "Inviter"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-700">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-green-700">{state.success}</p>}
      <p className="w-full text-xs text-slate-500">
        Pour trouver un identifiant : Discord → Paramètres → Avancés → Mode développeur, puis clic droit sur le membre → « Copier l&apos;identifiant ».
      </p>
    </form>
  );
}
