"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "@/lib/forms";

export type QuestFormValues = {
  id?: string;
  number?: number;
  title: string;
  description: string;
  points: number;
  openAt: string;
  closeAt: string;
  targetTeamId: string;
};

export function QuestForm({
  quest,
  teams,
  action,
  closeHref,
}: {
  quest?: QuestFormValues;
  teams: { id: string; name: string }[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  closeHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="card form-grid">
      {quest?.id && <input type="hidden" name="id" value={quest.id} />}
      <p className="eyebrow wide">{quest ? `Modifier la quête #${quest.number}` : "Nouvelle quête"}</p>
      <label className="field">
        Numéro
        <input name="number" type="number" min={1} defaultValue={quest?.number ?? ""} placeholder="auto" />
      </label>
      <label className="field" style={{ gridColumn: "span 2" }}>
        Titre
        <input name="title" required defaultValue={quest?.title ?? ""} placeholder="ex. Un livre dont le titre contient une couleur" />
      </label>
      <label className="field wide">
        Description
        <textarea name="description" rows={2} defaultValue={quest?.description ?? ""} />
      </label>
      <label className="field">
        Points
        <input name="points" type="number" min={0} required defaultValue={quest?.points ?? 20} />
      </label>
      <label className="field">
        Ouvre le (optionnel)
        <input name="openAt" type="datetime-local" defaultValue={quest?.openAt ?? ""} />
      </label>
      <label className="field">
        Ferme le (optionnel)
        <input name="closeAt" type="datetime-local" defaultValue={quest?.closeAt ?? ""} />
      </label>
      <label className="field wide">
        Réservée à une équipe (optionnel)
        <select name="targetTeamId" defaultValue={quest?.targetTeamId ?? ""}>
          <option value="">— toutes les équipes —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {state?.error && <p className="flash err wide">⚠️ {state.error}</p>}
      {state?.success && <p className="flash ok wide">{state.success}</p>}
      <div className="wide flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn">
          {pending ? "…" : quest?.id ? "Mettre à jour" : "Créer la quête"}
        </button>
        {closeHref && (
          <Link href={closeHref} className="btn ghost">
            Fermer
          </Link>
        )}
        <span className="text-[13px] text-[color:var(--muted)]">Annoncée dans le salon général à la création.</span>
      </div>
    </form>
  );
}
