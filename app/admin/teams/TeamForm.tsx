"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/forms";

export function TeamForm({ action }: { action: (prev: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="card form-grid">
      <p className="eyebrow wide">Créer une équipe</p>
      <label className="field">
        Nom
        <input name="name" required placeholder="ex. Les Renards" />
      </label>
      <label className="field">
        Couleur
        <input name="color" type="color" defaultValue="#2E4A7D" />
      </label>
      <label className="field">
        Salon aventure (id)
        <input name="discordChannelId" />
      </label>
      <label className="field">
        Salon librairie (id)
        <input name="discordLibraryChannelId" />
        <span className="hint">Sans ce salon, /ajouter-un-livre est refusé pour cette équipe.</span>
      </label>
      {state?.error && <p className="flash err wide">⚠️ {state.error}</p>}
      {state?.success && <p className="flash ok wide">{state.success}</p>}
      <div className="wide">
        <button type="submit" disabled={pending} className="btn">
          {pending ? "…" : "Créer l'équipe"}
        </button>
      </div>
    </form>
  );
}
