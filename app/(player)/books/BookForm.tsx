"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { fmtPoints } from "@/lib/format";
import type { ActionState } from "@/lib/forms";
import { effectiveType, readingPoints } from "@/lib/scoring/reading";

export type BookFormValues = {
  id?: string;
  title: string;
  author: string;
  pages: number | "";
  type: "ROMAN" | "GRAPHIQUE";
  finishedAt: string;
  questId: string;
  cellId: string;
};

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  values: BookFormValues;
  quests: { value: string; name: string }[];
  cells: { value: string; name: string }[];
  /** Currently linked quest/cell kept selectable even when complete. */
  currentQuest?: { value: string; name: string } | null;
  currentCell?: { value: string; name: string } | null;
  title: string;
  submitLabel: string;
  /** Sunday verification window is open (non-admins cannot write). */
  locked?: string | null;
};

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900";

export function BookForm({ action, values, quests, cells, currentQuest, currentCell, title, submitLabel, locked }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [pages, setPages] = useState<number | "">(values.pages);
  const [type, setType] = useState(values.type);
  const today = new Date().toISOString().slice(0, 10);
  const questOptions = currentQuest && !quests.some((q) => q.value === currentQuest.value) ? [currentQuest, ...quests] : quests;
  const cellOptions = currentCell && !cells.some((c) => c.value === currentCell.value) ? [currentCell, ...cells] : cells;
  const effective = pages ? effectiveType(pages, type === "GRAPHIQUE") : type;
  const preview = pages ? readingPoints(pages) : 0;

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <h1 className="text-2xl font-bold">{title}</h1>
      {locked && <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">{locked}</p>}
      <form action={formAction} className="flex flex-col gap-4">
        {values.id && <input type="hidden" name="bookId" value={values.id} />}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Titre
          <input name="title" required maxLength={200} defaultValue={values.title} className={field} autoFocus={!values.id} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Auteur·ice
          <input name="author" required maxLength={120} defaultValue={values.author} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre de pages
          <input
            name="pages"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            required
            defaultValue={values.pages}
            onChange={(e) => setPages(e.target.value ? Number(e.target.value) : "")}
            className={field}
          />
          <span className="text-xs font-normal text-slate-500">
            Édition la plus avantageuse (hors gros caractères) ; livre audio = pagination papier.
            {pages ? ` → ${fmtPoints(preview)} pt${preview >= 2 ? "s" : ""}` : ""}
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Type
          <select name="type" value={type} onChange={(e) => setType(e.target.value as "ROMAN" | "GRAPHIQUE")} className={field}>
            <option value="ROMAN">Roman</option>
            <option value="GRAPHIQUE">Graphique (BD, manga, roman graphique)</option>
          </select>
          <span className="text-xs font-normal text-slate-500">
            {effective === "GRAPHIQUE"
              ? pages && pages < 150 && type === "ROMAN"
                ? "Moins de 150 pages : compté comme graphique (points ÷ 2, ½ quête et ½ case)."
                : "Un graphique vaut ½ quête et ½ case : il en faut deux pour valider."
              : "Un roman valide seul une quête et/ou une case."}
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Valide une quête (optionnel)
          <select name="questId" defaultValue={values.questId} className={field}>
            <option value="">— aucune —</option>
            {questOptions.map((q) => (
              <option key={q.value} value={q.value}>
                {q.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Valide une case du bingo d&apos;équipe (optionnel)
          <select name="cellId" defaultValue={values.cellId} className={field}>
            <option value="">— aucune —</option>
            {cellOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-slate-500">
            En cochant une quête ou une case, tu attestes avoir commencé la lecture après la parution de la grille (ou lu moins de la moitié d&apos;un roman).
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Terminé le
          <input name="finishedAt" type="date" defaultValue={values.finishedAt || today} max={today} className={field} />
        </label>

        {state?.error && (
          <p className="rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{state.error}</p>
        )}

        <button type="submit" disabled={pending || !!locked} className="rounded-xl bg-indigo-600 py-3 text-lg font-semibold text-white disabled:opacity-60">
          {pending ? "Enregistrement…" : submitLabel}
        </button>
        <Link href="/books" className="text-center text-sm text-slate-500 underline">
          Annuler
        </Link>
      </form>
    </main>
  );
}
