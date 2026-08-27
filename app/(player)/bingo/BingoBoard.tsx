"use client";

import { useState } from "react";
import { placeBookAction, removeBookAction } from "./actions";

export type BoardCell = {
  id: string;
  label: string;
  prompt: string;
  books: { id: string; title: string; isGraphic: boolean; owner: string }[];
  weight: number;
  complete: boolean;
};

type Props = {
  title: string;
  size: number;
  cells: BoardCell[];
  /** Books the current user may place/move (own within 1 h, or whole team for the captain). */
  books: { id: string; title: string; isGraphic: boolean; owner: string; placedOn: string | null }[];
  completedLines: number;
};

export function BingoBoard({ title, size, cells, books, completedLines }: Props) {
  const [selected, setSelected] = useState<BoardCell | null>(null);
  const done = cells.filter((c) => c.complete).length;
  const textSize = size >= 6 ? "text-[8px]" : size === 5 ? "text-[9px]" : "text-[10px]";
  const editableIds = new Set(books.map((b) => b.id));

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-slate-500">
          {done}/{size * size} · {completedLines} ligne{completedLines > 1 ? "s" : ""}
        </p>
      </header>

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {cells.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c)}
            className={`flex aspect-square flex-col overflow-hidden rounded-md p-1 text-left ${textSize} leading-tight transition active:scale-95 ${
              c.complete
                ? "bg-indigo-600 text-white"
                : c.weight > 0
                  ? "bg-indigo-200 text-indigo-950 dark:bg-indigo-900 dark:text-indigo-100"
                  : "bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300"
            }`}
            title={`${c.label} — ${c.prompt}`}
          >
            <span className={`line-clamp-2 ${c.books.length ? "opacity-70" : ""}`}>{c.prompt}</span>
            {c.books.map((b) => (
              <span key={b.id} className="mt-0.5 line-clamp-1 font-semibold">
                {b.owner} — {b.title}
              </span>
            ))}
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Case {selected.label}</p>
          <p className="mb-2 font-semibold">{selected.prompt}</p>
          {selected.books.length > 0 && (
            <ul className="mb-3 flex flex-col gap-1 text-sm">
              {selected.books.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2">
                  <span>
                    {b.owner} — <strong>{b.title}</strong>
                    {b.isGraphic && <span className="ml-1 text-xs text-slate-500">(graphique, ½)</span>}
                  </span>
                  {editableIds.has(b.id) && (
                    <form action={removeBookAction}>
                      <input type="hidden" name="bookId" value={b.id} />
                      <button type="submit" onClick={() => setSelected(null)} className="text-xs text-red-600 underline">
                        Retirer
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {selected.complete ? (
            <p className="text-sm text-green-700">Case complétée ✅</p>
          ) : (
            <form action={placeBookAction} className="flex flex-col gap-2">
              <input type="hidden" name="cellId" value={selected.id} />
              <select name="bookId" required defaultValue="" className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                <option value="" disabled>
                  {selected.weight > 0 ? "Ajouter un second livre (½ manquant)…" : "Choisir un livre…"}
                </option>
                {books
                  .filter((b) => b.placedOn !== selected.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.placedOn ? "✓ " : ""}
                      {b.owner} — {b.title}
                      {b.isGraphic ? " (½)" : ""}
                    </option>
                  ))}
              </select>
              <div className="flex gap-2">
                <button type="submit" onClick={() => setSelected(null)} className="flex-1 rounded-lg bg-indigo-600 py-2 font-semibold text-white">
                  Valider
                </button>
                <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-3 py-2 text-slate-500">
                  Fermer
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Un livre = case complète ; un graphique = ½ case. ✓ = déjà placé ailleurs (il sera déplacé). Tu peux placer tes livres pendant 1 h après leur ajout ; ensuite c&apos;est le·la capitaine.
              </p>
            </form>
          )}
          {selected.complete && (
            <button type="button" onClick={() => setSelected(null)} className="mt-2 text-sm text-slate-500 underline">
              Fermer
            </button>
          )}
        </div>
      )}
    </section>
  );
}
