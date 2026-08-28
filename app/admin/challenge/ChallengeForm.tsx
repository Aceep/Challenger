"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/forms";

export type ChallengeValues = {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  color: string;
  pointsPerPage: number;
  bingoLineBonus: number;
  bingoFullBonus: number;
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  discordGuildId: string | null;
  discordGeneralChannelId: string | null;
};

export function ChallengeForm({
  challenge,
  action,
}: {
  challenge: ChallengeValues | null;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const c = challenge;

  return (
    <form action={formAction} className="card form-grid">
      {c && <input type="hidden" name="id" value={c.id} />}
      <label className="field wide">
        Nom de l&apos;édition
        <input name="name" required defaultValue={c?.name ?? ""} placeholder="ex. Automne des Pages 2026" />
      </label>
      <label className="field">
        Début
        <input name="startAt" type="date" required defaultValue={c?.startAt ?? ""} />
      </label>
      <label className="field">
        Fin
        <input name="endAt" type="date" required defaultValue={c?.endAt ?? ""} />
      </label>
      <label className="field">
        Couleur de l&apos;édition
        <input name="color" type="color" defaultValue={c?.color ?? "#2E4A7D"} />
        <span className="hint">Bannière d&apos;édition et cartes du site public.</span>
      </label>
      <label className="field">
        Points par page
        <input name="pointsPerPage" type="number" step="0.01" min="0.01" defaultValue={c?.pointsPerPage ?? 0.1} />
        <span className="hint">pages ÷ 10 · sous 150 pages, ÷ 2</span>
      </label>
      <label className="field">
        Bonus ligne de bingo
        <input name="bingoLineBonus" type="number" min="0" defaultValue={c?.bingoLineBonus ?? 25} />
      </label>
      <label className="field">
        Bonus grille complète
        <input name="bingoFullBonus" type="number" min="0" defaultValue={c?.bingoFullBonus ?? 100} />
      </label>
      <label className="field">
        Serveur Discord (id)
        <input name="discordGuildId" defaultValue={c?.discordGuildId ?? ""} />
      </label>
      <label className="field">
        Salon général (id)
        <input name="discordGeneralChannelId" defaultValue={c?.discordGeneralChannelId ?? ""} />
        <span className="hint">Bot + admins seulement : classement du dimanche, fenêtre de vérification, changements de leader.</span>
      </label>
      <label className="field">
        Statut
        <select name="status" defaultValue={c?.status ?? "DRAFT"}>
          <option value="DRAFT">Brouillon</option>
          <option value="ACTIVE">Actif</option>
          <option value="FINISHED">Terminé</option>
        </select>
      </label>

      {state?.error && <p className="flash err wide">⚠️ {state.error}</p>}
      {state?.success && <p className="flash ok wide">{state.success}</p>}

      <div className="wide flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn">
          {pending ? "Enregistrement…" : c ? "Enregistrer" : "Créer l'édition"}
        </button>
        <span className="text-[13px] text-[color:var(--muted)]">
          Le calendrier hebdomadaire (dim. 19 h – 21 h, classement 20 h, Europe/Paris) est fixé par le règlement.
        </span>
      </div>
    </form>
  );
}
