"use client";

import { useState, type ReactNode } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { BingoCell, PageTitle, Pill } from "@/components/ui";

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
  /** Books the current user may place/move (own within 1 h, or whole team for the captain). */
  books: { id: string; title: string; type: "ROMAN" | "GRAPHIQUE"; owner: string; placedOn: string | null }[];
  completedLines: number;
  /** Label (B3) of the cell validated by the last action: it pops once. */
  justValidated?: string | null;
  order: number;
  total: number;
  /** Replaces the player heading (admin supervision reuses the board). */
  heading?: ReactNode;
  /** Replaces the "who may place a reading" note under the panel. */
  hint?: ReactNode;
  placeBookAction: (formData: FormData) => Promise<void>;
  removeBookAction: (formData: FormData) => Promise<void>;
};

export function BingoBoard({ title, size, cells, books, completedLines, order, total, heading, hint, placeBookAction, removeBookAction, justValidated }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Derived from the latest props so the panel reflects the cell after an action.
  const selected = cells.find((c) => c.id === selectedId) ?? null;
  const done = cells.filter((c) => c.complete).length;
  const editableIds = new Set(books.map((b) => b.id));
  const state = (c: BoardCell) => (c.complete ? "validée" : c.weight > 0 ? "en attente ½" : "libre");

  return (
    <section className="bingo-layout flex flex-col gap-4">
      {heading ?? (
        <PageTitle
          stack
          action={
            <p className="meta row">
              <span>
                Grille {order} sur {total}
              </span>
              <span className="accent">« {title} »</span>
              <span>
                {done}/{size * size}
              </span>
              <span>
                {completedLines} ligne{completedLines > 1 ? "s" : ""}
              </span>
            </p>
          }
        >
          Bingo d’équipe
        </PageTitle>
      )}

      <div className="bingo-grid" data-tour="bingo-board" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {cells.map((c) => (
          <BingoCell
            key={c.id}
            label={c.label}
            prompt={c.prompt}
            state={c.complete ? "done" : c.weight > 0 ? "half" : "free"}
            selected={selectedId === c.id}
            pop={justValidated === c.label}
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

      <p className="legend">
        <span>
          <i style={{ background: "var(--olive)", borderColor: "var(--olive)" }} />
          validée
        </span>
        <span>
          <i className="stripes" style={{ borderColor: "var(--kyle-deep)" }} />
          en attente ½
        </span>
        <span>
          <i style={{ background: "var(--surface)" }} />
          libre
        </span>
      </p>

      {selected && (
        <div className="sheet">
          <div className="flex items-center justify-between gap-3">
            <h3>
              Case {selected.label} <span className="accent">— {selected.prompt}</span>
            </h3>
            <Pill stamp tone={selected.complete ? "ok" : selected.weight > 0 ? "wait" : "type"}>
              {state(selected)}
            </Pill>
          </div>
          {selected.books.length === 0 ? (
            <p className="meta">Aucune lecture posée.</p>
          ) : (
            <ul className="flex flex-col">
              {selected.books.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 border-b border-dotted border-[color:var(--line-strong)] py-2 last:border-0 text-[14px]">
                  <span>
                    <strong>{b.owner}</strong> — {b.title} {b.type === "GRAPHIQUE" && <Pill tone="type">graphique</Pill>}
                  </span>
                  {editableIds.has(b.id) && (
                    <form action={removeBookAction}>
                      <input type="hidden" name="bookId" value={b.id} />
                      <SubmitButton className="btn sm danger" pendingLabel="…">
                        Retirer
                      </SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {selected.complete ? (
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedId(null)} className="btn sm ghost">
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
                        {b.placedOn ? "déjà placée · " : ""}
                        {b.owner} — {b.title}
                        {b.type === "GRAPHIQUE" ? " (½)" : ""}
                      </option>
                    ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setSelectedId(null)} className="btn sm ghost">
                  Fermer
                </button>
                <SubmitButton className="btn sm" pendingLabel="Enregistrement…">
                  Valider
                </SubmitButton>
              </div>
              <p className="meta-xs">
                {hint ?? (
                  <>
                    Un roman valide la case : le ½ déjà posé revient en attente. Un graphique = ½ case. Une lecture « déjà placée » sera déplacée ici. Tu peux
                    placer tes lectures pendant 1 h après leur ajout ; ensuite c’est le·la capitaine.
                  </>
                )}
              </p>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
