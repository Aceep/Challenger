"use client";

import { useActionState } from "react";
import { CHALLENGE_DEFAULTS } from "@/lib/tenancy/new-challenge";
import type { ActionState } from "@/lib/forms";

export type NewChallengeDefaults = {
  /** `yyyy-mm-dd`, ready for `<input type="date">`. */
  startAt: string;
  endAt: string;
};

/**
 * Creation form: the four decisions that matter, the barème folded away.
 * Same markup as the admin `ChallengeForm` — it is the same object, seen
 * before it exists.
 */
export function NewChallengeForm({
  defaults,
  action,
}: {
  defaults: NewChallengeDefaults;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="card form-grid">
      <label className="field wide">
        Nom du défi
        <input name="name" required maxLength={100} defaultValue="" placeholder="ex. Automne des Pages 2026" />
        <span className="hint">Visible par tout le monde ; tu pourras le changer.</span>
      </label>
      <label className="field">
        Début
        <input name="startAt" type="date" required defaultValue={defaults.startAt} />
      </label>
      <label className="field">
        Fin
        <input name="endAt" type="date" required defaultValue={defaults.endAt} />
      </label>
      <label className="field">
        Couleur du défi
        <input name="color" type="color" defaultValue={CHALLENGE_DEFAULTS.color} />
        <span className="hint">Bannière d’édition et cartes du site.</span>
      </label>

      <details className="wide">
        <summary className="eyebrow">Réglages avancés</summary>
        <div className="form-grid mt-3">
          <label className="field">
            Points par page
            <input name="pointsPerPage" type="number" step="0.01" min="0.01" defaultValue={CHALLENGE_DEFAULTS.pointsPerPage} />
            <span className="hint">pages ÷ 10 · sous 150 pages, ÷ 2</span>
          </label>
          <label className="field">
            Bonus ligne de bingo
            <input name="bingoLineBonus" type="number" min="0" defaultValue={CHALLENGE_DEFAULTS.bingoLineBonus} />
          </label>
          <label className="field">
            Bonus grille complète
            <input name="bingoFullBonus" type="number" min="0" defaultValue={CHALLENGE_DEFAULTS.bingoFullBonus} />
          </label>
        </div>
      </details>

      {state?.error && <p className="flash err wide">{state.error}</p>}

      <div className="wide flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn">
          {pending ? "Création…" : "Créer mon défi"}
        </button>
        <span className="text-[13px] text-[color:var(--muted)]">Statut&#8239;: brouillon. Tu l’activeras quand tout sera prêt.</span>
      </div>
    </form>
  );
}
