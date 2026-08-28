"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/forms";

export type GridValues = { id?: string; title: string; size: number; prompts: string[] };

export function GridForm({
  grid,
  action,
  number,
  closeHref,
}: {
  grid: GridValues | null;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  number: number;
  closeHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [size, setSize] = useState(grid?.size ?? 5);
  const [text, setText] = useState(grid?.prompts.join("\n") ?? "");
  const count = text.split("\n").filter((l) => l.trim()).length;
  const expected = size * size;

  return (
    <form action={formAction} className="card form-grid">
      {grid?.id && <input type="hidden" name="gridId" value={grid.id} />}
      <p className="eyebrow wide">{grid ? `Modifier la grille n° ${number}` : `Ajouter une grille (n° ${number})`}</p>
      <label className="field">
        Titre
        <input name="title" required defaultValue={grid?.title ?? ""} placeholder="ex. Frissons d'octobre" />
      </label>
      <label className="field">
        Taille
        <select name="size" value={size} onChange={(e) => setSize(Number(e.target.value))}>
          {[3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} × {n}
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span>Aperçu</span>
        <div className="mini-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: size * 14 }}>
          {Array.from({ length: expected }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>
      <label className="field wide">
        Consignes — une par ligne, de gauche à droite puis de haut en bas ({count}/{expected})
        <textarea
          name="prompts"
          rows={Math.min(expected, 14)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Un livre à la couverture rouge\nUn roman de plus de 500 pages\n…"}
          className="font-mono text-sm"
        />
      </label>
      {state?.error && <p className="flash err wide">⚠️ {state.error}</p>}
      {state?.success && <p className="flash ok wide">{state.success}</p>}
      <div className="wide flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || count !== expected} className="btn">
          {pending ? "…" : grid ? "Mettre à jour" : "Créer la grille"}
        </button>
        {closeHref && (
          <Link href={closeHref} className="btn ghost">
            Fermer
          </Link>
        )}
        {grid && (
          <span className="text-xs text-[color:var(--muted)]">
            Modifier une consigne conserve les lectures placées ; réduire la taille supprime les cases hors grille.
          </span>
        )}
      </div>
    </form>
  );
}
