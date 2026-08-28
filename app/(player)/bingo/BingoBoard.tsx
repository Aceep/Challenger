"use client";

import { useState } from "react";
import { BingoCell, Pill } from "@/components/ui";

export type BoardCell = {
  id: string;
  label: string;
  prompt: string;
  books: { id: string; title: string; type: "ROMAN" | "GRAPHIQUE"; owner: string }[];
  weight: number;
  complete: boolean;
};

type Props = {
  title: string;
  size: number;
  cells: BoardCell[];
  /** Books the current user may place/move (own within 1 h, or whole team for the captain). */
  books: { id: string; title: string; type: "ROMAN" | "GRAPHIQUE"; owner: string; placedOn: string | null }[];
  completedLines: number;
  order: number;
  total: number;
  placeBookAction: (formData: FormData) => Promise<void>;
  removeBookAction: (formData: FormData) => Promise<void>;
};

export function BingoBoard({ title, size, cells, books, completedLines, order, total, placeBookAction, removeBookAction }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Derived from the latest props so the panel reflects the cell after an action.
  const selected = cells.find((c) => c.id === selectedId) ?? null;
  const done = cells.filter((c) => c.complete).length;
  const editableIds = new Set(books.map((b) => b.id));

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h1>Bingo d&apos;équipe</h1>
        <p className="text-[13px] text-[color:var(--muted)]">
          Grille {order} sur {total} · « {title} » · {done}/{size * size} · {completedLines} ligne{completedLines > 1 ? "s" : ""}
        </p>
      </div>

      <div className="bingo-grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {cells.map((c) => (
          <BingoCell
            key={c.id}
            label={c.label}
            prompt={c.prompt}
            state={c.complete ? "done" : c.weight > 0 ? "half" : "free"}
            selected={selectedId === c.id}
            onClick={() => setSelectedId(c.id)}
            note={
              c.books.length
                ? c.books.map((b) => (
                    <span key={b.id}>
                      {b.owner} — {b.title}
                      {b.type === "GRAPHIQUE" ? " ½" : ""}
                    </span>
                  ))
                : undefined
            }
          />
        ))}
      </div>

      <div className="legend">
        <span>
          <i style={{ background: "var(--olive)" }} />
          validée
        </span>
        <span>
          <i className="stripes" style={{ border: "1px solid var(--kyle-deep)" }} />
          en attente ½
        </span>
        <span>
          <i style={{ background: "var(--surface)", border: "1px solid var(--line)" }} />
          libre
        </span>
      </div>

      {selected && (
        <div className="sheet">
          <p className="eyebrow">
            Case {selected.label} · {selected.complete ? "validée ✅" : selected.weight > 0 ? "en attente ½" : "libre"}
          </p>
          <p className="font-extrabold">{selected.prompt}</p>
          {selected.books.length === 0 ? (
            <p className="text-[13px] text-[color:var(--muted)]">Aucune lecture posée.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-[13px]">
              {selected.books.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2">
                  <span>
                    {b.owner} — <strong>{b.title}</strong> {b.type === "GRAPHIQUE" && <Pill tone="wait">½</Pill>}
                  </span>
                  {editableIds.has(b.id) && (
                    <form action={removeBookAction}>
                      <input type="hidden" name="bookId" value={b.id} />
                      <button type="submit" className="text-xs text-[color:var(--brick)] underline">
                        Retirer
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {selected.complete ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedId(null)} className="btn small ghost">
                Fermer
              </button>
            </div>
          ) : (
            <form action={placeBookAction} className="flex flex-col gap-2.5">
              <input type="hidden" name="cellId" value={selected.id} />
              <label className="field">
                {selected.weight > 0 ? "Ajouter la seconde moitié (ou un roman)" : "Poser une lecture"}
                <select name="bookId" required defaultValue="">
                  <option value="" disabled>
                    Choisir une lecture…
                  </option>
                  {books
                    .filter((b) => b.placedOn !== selected.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.placedOn ? "✓ " : ""}
                        {b.owner} — {b.title}
                        {b.type === "GRAPHIQUE" ? " (½)" : ""}
                      </option>
                    ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button type="submit" className="btn small flex-1">
                  Valider
                </button>
                <button type="button" onClick={() => setSelectedId(null)} className="btn small ghost">
                  Fermer
                </button>
              </div>
              <p className="text-xs text-[color:var(--muted)]">
                Un roman valide la case : le ½ déjà posé revient en attente. Un graphique = ½ case. ✓ = déjà placé ailleurs (il sera déplacé). Tu peux placer tes
                lectures pendant 1 h après leur ajout ; ensuite c&apos;est le·la capitaine.
              </p>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
