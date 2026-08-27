"use client";

import { useState } from "react";
import { fillCellAction, unfillCellAction } from "./actions";

export type BoardCell = {
  id: string;
  row: number;
  col: number;
  prompt: string;
  fill: { book: { id: string; title: string; author: string } } | null;
};

type Props = {
  scope: "PLAYER" | "TEAM";
  title: string;
  size: number;
  cells: BoardCell[];
  books: { id: string; title: string; author: string; owner?: string | null }[];
  completedLines: string[];
  canEdit: boolean;
};

export function BingoBoard({ scope, title, size, cells, books, completedLines, canEdit }: Props) {
  const [selected, setSelected] = useState<BoardCell | null>(null);
  const filled = cells.filter((c) => c.fill).length;
  const placed = new Set(cells.map((c) => c.fill?.book.id).filter(Boolean));
  const textSize = size >= 6 ? "text-[9px]" : size === 5 ? "text-[10px]" : "text-[11px]";

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-slate-500">
          {filled}/{size * size} · {completedLines.length} ligne{completedLines.length > 1 ? "s" : ""}
        </p>
      </header>

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {cells.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => canEdit && setSelected(c)}
            className={`aspect-square overflow-hidden rounded-md p-1 ${textSize} leading-tight transition ${
              c.fill
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300"
            } ${canEdit ? "active:scale-95" : "cursor-default"}`}
            title={c.fill ? `${c.prompt} — ${c.fill.book.title}` : c.prompt}
          >
            <span className="line-clamp-4">{c.fill ? c.fill.book.title : c.prompt}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Case</p>
          <p className="mb-3 font-semibold">{selected.prompt}</p>
          {selected.fill && (
            <p className="mb-3 text-sm">
              Actuellement : <strong>{selected.fill.book.title}</strong>
            </p>
          )}
          <form action={fillCellAction} className="flex flex-col gap-2">
            <input type="hidden" name="cellId" value={selected.id} />
            <input type="hidden" name="scope" value={scope} />
            <select
              name="bookId"
              required
              defaultValue={selected.fill?.book.id ?? ""}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="" disabled>
                Choisir un livre…
              </option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {placed.has(b.id) && b.id !== selected.fill?.book.id ? "✓ " : ""}
                  {b.title} — {b.author}
                  {b.owner ? ` (${b.owner})` : ""}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                onClick={() => setSelected(null)}
                className="flex-1 rounded-lg bg-indigo-600 py-2 font-semibold text-white"
              >
                Valider
              </button>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-3 py-2 text-slate-500">
                Fermer
              </button>
            </div>
          </form>
          {selected.fill && (
            <form action={unfillCellAction} className="mt-2">
              <input type="hidden" name="cellId" value={selected.id} />
              <input type="hidden" name="scope" value={scope} />
              <button type="submit" onClick={() => setSelected(null)} className="text-sm text-red-600 underline">
                Retirer le livre de cette case
              </button>
            </form>
          )}
          {books.length === 0 && <p className="mt-2 text-sm text-slate-500">Aucun livre disponible : enregistre d&apos;abord une lecture.</p>}
          {placed.size > 0 && <p className="mt-2 text-xs text-slate-500">✓ = déjà placé sur une autre case (il sera déplacé).</p>}
        </div>
      )}
    </section>
  );
}
