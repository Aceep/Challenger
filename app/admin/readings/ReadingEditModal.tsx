"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BookCover } from "@/components/ui/BookCover";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { fmtPoints } from "@/lib/format";
import { effectiveType, readingPoints } from "@/lib/scoring/reading";

export type Choice = { value: string; name: string };

export type AdminReadingEdit = {
  id: string;
  title: string;
  author: string;
  pages: number;
  /** Type as declared by the player (before the < 150 p. rule). */
  type: "ROMAN" | "GRAPHIQUE";
  /** yyyy-mm-dd */
  finishedAt: string;
  questId: string;
  cellId: string;
  owner: string;
  teamName: string | null;
  /** OpenLibrary cover, shown as-is: an organiser corrects the facts, not the picture. */
  coverUrl: string | null;
  quests: Choice[];
  cells: Choice[];
  /** Currently linked quest / cell, kept selectable even when complete. */
  currentQuest: Choice | null;
  currentCell: Choice | null;
};

type Props = {
  reading: AdminReadingEdit;
  closeHref: string;
  /** Current filters, forwarded so the action redirects back to the same view. */
  backQuery: string;
  updateReadingAction: (formData: FormData) => Promise<void>;
  deleteReadingAction: (formData: FormData) => Promise<void>;
};

/** Admin edit of a reading, in a modal; closing with unsaved changes asks for confirmation. */
export function ReadingEditModal({ reading, closeHref, backQuery, updateReadingAction, deleteReadingAction }: Props) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const initial = useRef<Map<string, string> | null>(null);
  const [pages, setPages] = useState<number | "">(reading.pages);
  const [type, setType] = useState(reading.type);

  const snapshot = () => {
    const m = new Map<string, string>();
    root.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[name], select[name]").forEach((el) => {
      if (el.type !== "hidden") m.set(`${el.form?.dataset.form}:${el.name}`, el.value);
    });
    return m;
  };
  const isDirty = () => {
    const now = snapshot();
    const before = initial.current ?? snapshot();
    for (const [k, v] of now) if (before.get(k) !== v) return true;
    return false;
  };
  const remember = () => {
    if (!initial.current) initial.current = snapshot();
  };

  const questOptions = reading.currentQuest && !reading.quests.some((q) => q.value === reading.currentQuest!.value) ? [reading.currentQuest, ...reading.quests] : reading.quests;
  const cellOptions = reading.currentCell && !reading.cells.some((c) => c.value === reading.currentCell!.value) ? [reading.currentCell, ...reading.cells] : reading.cells;
  const effective = pages ? effectiveType(pages, type === "GRAPHIQUE") : type;
  const preview = pages ? readingPoints(pages) : 0;

  return (
    <Modal title={`Modifier · ${reading.title}`} onClose={() => router.push(closeHref)} isDirty={isDirty}>
      <div ref={root} onFocusCapture={remember} className="flex flex-col gap-5">
        <div className="reading-cell">
          <BookCover src={reading.coverUrl} title={reading.title} width={44} />
          <p className="text-[13px] text-[color:var(--muted)]">
            Lecture de <strong>{reading.owner}</strong>
            {reading.teamName ? ` · ${reading.teamName}` : ""}. Les points, les quêtes et les cases sont recalculés à l&apos;enregistrement.
          </p>
        </div>

        <form action={updateReadingAction} data-form="reading" className="form-grid">
          <input type="hidden" name="bookId" value={reading.id} />
          <input type="hidden" name="back" value={backQuery} />
          <label className="field wide">
            Titre
            <input name="title" required maxLength={200} defaultValue={reading.title} />
          </label>
          <label className="field">
            Auteur·ice
            <input name="author" required maxLength={120} defaultValue={reading.author} />
          </label>
          <label className="field">
            Nombre de pages
            <input
              name="pages"
              type="number"
              inputMode="numeric"
              min={1}
              max={5000}
              required
              defaultValue={reading.pages}
              onChange={(e) => setPages(e.target.value ? Number(e.target.value) : "")}
            />
            <span className="hint">
              {pages ? (
                <>
                  →{" "}
                  <strong className="text-[color:var(--ink)]">
                    {fmtPoints(preview)} pt{preview >= 2 ? "s" : ""}
                  </strong>{" "}
                  (les points de l&apos;équipe sont corrigés dans le livre de comptes)
                </>
              ) : (
                "Édition la plus avantageuse ; livre audio = pagination papier."
              )}
            </span>
          </label>
          <label className="field">
            Type
            <select name="type" value={type} onChange={(e) => setType(e.target.value as "ROMAN" | "GRAPHIQUE")}>
              <option value="ROMAN">Roman</option>
              <option value="GRAPHIQUE">Graphique (BD, manga, roman graphique)</option>
            </select>
            <span className="hint">
              {effective === "GRAPHIQUE"
                ? pages && pages < 150 && type === "ROMAN"
                  ? "Moins de 150 pages : compté comme graphique (points ÷ 2, ½ quête et ½ case)."
                  : "Un graphique vaut ½ quête et ½ case : il en faut deux pour valider."
                : "Un roman valide seul une quête et/ou une case."}
            </span>
          </label>
          <label className="field">
            Quête
            <select name="questId" defaultValue={reading.questId}>
              <option value="">— aucune —</option>
              {questOptions.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Case du bingo d&apos;équipe
            <select name="cellId" defaultValue={reading.cellId}>
              <option value="">— aucune —</option>
              {cellOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="hint">Seules les cases de la grille en cours de l&apos;équipe sont proposées.</span>
          </label>
          <label className="field">
            Terminé le
            <input name="finishedAt" type="date" defaultValue={reading.finishedAt} />
          </label>
          <div className="wide">
            <SubmitButton className="btn" pendingLabel="Enregistrement…">
              Enregistrer
            </SubmitButton>
          </div>
        </form>

        <form action={deleteReadingAction} className="flex items-center justify-between gap-3 border-t border-[color:var(--line)] pt-4">
          <input type="hidden" name="bookId" value={reading.id} />
          <input type="hidden" name="back" value={backQuery} />
          <span className="text-[13px] text-[color:var(--muted)]">
            La suppression détache la quête et la case (elles repassent « en attente ») et annule les points.
          </span>
          <SubmitButton className="btn small danger" pendingLabel="Suppression…">
            Supprimer la lecture
          </SubmitButton>
        </form>
      </div>
    </Modal>
  );
}
