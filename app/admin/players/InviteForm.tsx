"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/forms";

export function InviteForm({
  teams,
  action,
}: {
  teams: { id: string; name: string }[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="card flex flex-col gap-3">
      <p className="eyebrow">Inviter</p>
      <label className="field">
        Identifiant Discord
        <input name="discordId" required inputMode="numeric" placeholder="ex. 402911870034211187" />
        <span className="hint">Le joueur se connecte ensuite avec Discord ; l&apos;invitation fixe son équipe et son rôle.</span>
      </label>
      <label className="field">
        Équipe
        <select name="teamId" defaultValue="">
          <option value="">— plus tard —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Rôle
        <select name="role" defaultValue="PLAYER">
          <option value="PLAYER">Joueur·euse</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>
      {state?.error && <p className="flash err">⚠️ {state.error}</p>}
      {state?.success && <p className="flash ok">{state.success}</p>}
      <button type="submit" disabled={pending} className="btn">
        {pending ? "…" : "Créer l'invitation"}
      </button>
      <p className="text-xs text-[color:var(--muted)]">
        Pour trouver un identifiant : Discord → Paramètres → Avancés → Mode développeur, puis clic droit sur le membre → « Copier l&apos;identifiant ».
      </p>
    </form>
  );
}
