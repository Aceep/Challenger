"use client";

import { useActionState, useState } from "react";
import { deleteGridAction, saveGridAction } from "./actions";

type Props = { grid: { title: string; size: number; prompts: string[] } | null };

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900";

export function GridForm({ grid }: Props) {
  const [state, action, pending] = useActionState(saveGridAction, null);
  const [size, setSize] = useState(grid?.size ?? 5);
  const [text, setText] = useState(grid?.prompts.join("\n") ?? "");
  const count = text.split("\n").filter((l) => l.trim()).length;
  const expected = size * size;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="text-lg font-bold">Grille d&apos;équipe</h2>
      <form action={action} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Titre
            <input name="title" required defaultValue={grid?.title ?? "Bingo d'équipe"} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Taille
            <select name="size" value={size} onChange={(e) => setSize(Number(e.target.value))} className={field}>
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} × {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Consignes — une par ligne, de gauche à droite puis de haut en bas ({count}/{expected})
          <textarea
            name="prompts"
            rows={Math.min(expected, 14)}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Un livre à la couverture rouge\nUn roman de plus de 500 pages\n…"}
            className={`${field} font-mono text-sm`}
          />
        </label>
        {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending || count !== expected} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
            {pending ? "…" : grid ? "Mettre à jour" : "Créer la grille"}
          </button>
          {grid && <p className="text-xs text-slate-500">Modifier une consigne conserve les livres placés ; réduire la taille supprime les cases hors grille.</p>}
        </div>
      </form>
      {grid && (
        <form action={deleteGridAction}>
          <button className="text-sm text-red-600 underline">Supprimer la grille (et les livres placés)</button>
        </form>
      )}
    </div>
  );
}
