"use client";

import { useState } from "react";
import { deleteGridAction, moveGridAction } from "./actions";
import { GridForm, type GridValues } from "./GridForm";

export function GridList({ grids }: { grids: (GridValues & { id: string; order: number; teams: number })[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  if (!grids.length) return <p className="text-sm text-slate-500">Aucune grille pour l&apos;instant.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {grids.map((g, i) =>
        editing === g.id ? (
          <li key={g.id}>
            <GridForm grid={g} onDone={() => setEditing(null)} />
          </li>
        ) : (
          <li key={g.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="min-w-0">
              <p className="font-semibold">
                Grille {g.order} — {g.title}
              </p>
              <p className="text-xs text-slate-500">
                {g.size} × {g.size} · {g.teams} équipe{g.teams > 1 ? "s" : ""} l&apos;{g.teams > 1 ? "ont" : "a"} ouverte
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-sm">
              <form action={moveGridAction}>
                <input type="hidden" name="gridId" value={g.id} />
                <input type="hidden" name="direction" value="up" />
                <button disabled={i === 0} className="disabled:opacity-30" title="Monter">
                  ↑
                </button>
              </form>
              <form action={moveGridAction}>
                <input type="hidden" name="gridId" value={g.id} />
                <input type="hidden" name="direction" value="down" />
                <button disabled={i === grids.length - 1} className="disabled:opacity-30" title="Descendre">
                  ↓
                </button>
              </form>
              <button type="button" onClick={() => setEditing(g.id)} className="underline">
                Modifier
              </button>
              <form action={deleteGridAction}>
                <input type="hidden" name="gridId" value={g.id} />
                <button className="text-red-600 underline">Supprimer</button>
              </form>
            </div>
          </li>
        ),
      )}
    </ul>
  );
}
