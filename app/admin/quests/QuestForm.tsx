"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
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

type Props = {
  quest?: QuestFormValues;
  /** Number the next quest will get (shown read-only when creating). */
  nextNumber: number;
  teams: { id: string; name: string }[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Where to go once saved (the modal closes); a flash message is appended. */
  doneHref: string;
  onCancel?: () => void;
};

export function QuestForm({ quest, nextNumber, teams, action, doneHref, onCancel }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.success) router.push(`${doneHref}${doneHref.includes("?") ? "&" : "?"}ok=${encodeURIComponent(state.success)}`);
  }, [state, router, doneHref]);

  return (
    <form action={formAction} className="form-grid" data-quest-form>
      {quest?.id && <input type="hidden" name="id" value={quest.id} />}
      <div className="field">
        <span>Numéro</span>
        <p className="num rounded-[10px] border-[1.5px] border-dashed border-[color:var(--line)] px-3 py-2.5 font-display text-[18px] font-black">#{quest?.number ?? nextNumber}</p>
        <span className="hint">Attribué automatiquement, dans l&apos;ordre de création.</span>
      </div>
      <label className="field" style={{ gridColumn: "span 2" }}>
        Titre
        <input name="title" required autoFocus defaultValue={quest?.title ?? ""} placeholder="ex. Un livre dont le titre contient une couleur" />
      </label>
      <label className="field wide">
        Description (optionnel)
        <textarea name="description" rows={2} defaultValue={quest?.description ?? ""} placeholder="Précisions, exemples, ce qui compte ou non…" />
      </label>
      <label className="field">
        Points
        <input name="points" type="number" min={0} required defaultValue={quest?.points ?? 20} />
        <span className="hint">Versés à l&apos;équipe à la validation.</span>
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
      <p className="wide rounded-[10px] bg-[color:var(--surface-2)] px-3 py-2 text-[13px] text-[color:var(--muted)]">
        Les joueurs la valident avec un <strong>roman</strong>, ou <strong>deux graphiques</strong> (d&apos;un ou deux membres). {quest ? "" : "Elle sera annoncée dans le salon général à la création."}
      </p>
      {state?.error && <p className="flash err wide">⚠️ {state.error}</p>}
      <div className="wide flex flex-wrap items-center justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn ghost">
            Annuler
          </button>
        )}
        <button type="submit" disabled={pending} className="btn">
          {pending ? "Enregistrement…" : quest?.id ? "Enregistrer" : "Créer la quête"}
        </button>
      </div>
    </form>
  );
}
