"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/forms";
import { ManualIdField, MemberPicker, type MemberHit } from "./MemberPicker";

/**
 * Inviting from the site. When the edition is wired to a Discord server, one
 * searches the member by pseudonym (`MemberPicker`); otherwise the identifier
 * is the only handle we have, and the plain field is shown alone.
 */
export function InviteForm({
  teams,
  action,
  canSearch,
  searchMembersAction,
}: {
  teams: { id: string; name: string }[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** The edition knows its Discord server: the member search can answer. */
  canSearch?: boolean;
  searchMembersAction?: (query: string) => Promise<MemberHit[]>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const searchable = !!canSearch && !!searchMembersAction;
  return (
    <form action={formAction} className="card flex flex-col gap-3">
      <p className="eyebrow">Inviter</p>
      {searchable ? <MemberPicker search={searchMembersAction} /> : <ManualIdField />}
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
          <option value="ORGANIZER">Organisateur·ice</option>
        </select>
      </label>
      {state?.error && <p className="flash err">⚠️ {state.error}</p>}
      {state?.success && <p className="flash ok">{state.success}</p>}
      <button type="submit" disabled={pending} className="btn">
        {pending ? "…" : "Créer l'invitation"}
      </button>
      <p className="text-xs text-[color:var(--muted)]">
        Kyle écrit à la personne en message privé. L&apos;invitation s&apos;applique à sa prochaine connexion — tout de suite si elle a déjà un compte. Depuis
        Discord, la même chose tient en une commande : <code>/inviter</code>.
      </p>
    </form>
  );
}
