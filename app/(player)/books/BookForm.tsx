"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { BookCover } from "@/components/ui/BookCover";
import { PageTitle, Pill } from "@/components/ui";
import { AlertIcon, SearchIcon } from "@/components/ui/icons";
import { fmtPoints } from "@/lib/format";
import type { ActionState } from "@/lib/forms";
import { effectiveType, readingPoints } from "@/lib/scoring/reading";
import { TitleAutocomplete } from "./TitleAutocomplete";

export type BookFormValues = {
  id?: string;
  title: string;
  author: string;
  pages: number | "";
  type: "ROMAN" | "GRAPHIQUE";
  finishedAt: string;
  questId: string;
  cellId: string;
  /** Cover picked in the autocomplete; absent when the reading was typed by hand or came from Discord. */
  coverUrl?: string | null;
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
  /** `/demo` when rendered by the read-only demo. */
  prefix?: string;
  /** Rendered inside a modal: no page shell, « Annuler » calls onCancel. */
  embedded?: boolean;
  onCancel?: () => void;
};

export function BookForm({ action, values, quests, cells, currentQuest, currentCell, title, submitLabel, locked, prefix = "", embedded, onCancel }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [bookTitle, setBookTitle] = useState(values.title);
  const [author, setAuthor] = useState(values.author);
  const [pages, setPages] = useState<number | "">(values.pages);
  const [coverUrl, setCoverUrl] = useState(values.coverUrl ?? "");
  const [type, setType] = useState(values.type);
  const today = new Date().toISOString().slice(0, 10);
  // The demo is public: the search route asks for a session, so the combobox stays a plain input there.
  const isDemo = prefix === "/demo";
  const questOptions = currentQuest && !quests.some((q) => q.value === currentQuest.value) ? [currentQuest, ...quests] : quests;
  const cellOptions = currentCell && !cells.some((c) => c.value === currentCell.value) ? [currentCell, ...cells] : cells;
  const effective = pages ? effectiveType(pages, type === "GRAPHIQUE") : type;
  const preview = pages ? readingPoints(pages) : 0;

  const Shell = embedded ? "div" : "main";
  return (
    <Shell className={embedded ? "flex flex-col gap-4" : "flex flex-1 flex-col gap-5 p-5"}>
      {!embedded && <PageTitle>{title}</PageTitle>}
      {locked && (
        <p className="flash warn">
          <SearchIcon />
          {locked}
        </p>
      )}
      <form action={formAction} className="flex flex-col gap-4" data-book-form>
        {values.id && <input type="hidden" name="bookId" value={values.id} />}
        <input type="hidden" name="coverUrl" value={coverUrl} />
        <label className="field">
          Titre
          <TitleAutocomplete
            value={bookTitle}
            onChange={setBookTitle}
            onPick={(s) => {
              setBookTitle(s.title);
              if (s.author) setAuthor(s.author);
              if (s.pages) setPages(s.pages);
              setCoverUrl(s.coverUrl ?? "");
            }}
            autoFocus={!values.id}
            disabled={isDemo}
          />
        </label>
        {coverUrl && (
          <div className="cover-picked">
            <BookCover src={coverUrl} title={bookTitle || "cette lecture"} width={44} />
            <span className="hint">Couverture trouvée sur OpenLibrary. Elle accompagnera la lecture partout — dans l’appli comme sur Discord.</span>
            <button type="button" className="btn sm ghost" onClick={() => setCoverUrl("")}>
              Retirer
            </button>
          </div>
        )}
        <label className="field">
          Auteur·ice
          <input name="author" required maxLength={120} value={author} onChange={(e) => setAuthor(e.target.value)} />
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
            value={pages}
            onChange={(e) => setPages(e.target.value ? Number(e.target.value) : "")}
          />
          <span className="hint">
            Édition la plus avantageuse (hors gros caractères) ; livre audio = pagination papier.
            {pages ? (
              <>
                {" → "}
                <Pill stamp xs tone="ok">
                  {fmtPoints(preview)} pt{preview >= 2 ? "s" : ""}
                </Pill>
              </>
            ) : null}
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
          Valide une quête (optionnel)
          <select name="questId" defaultValue={values.questId}>
            <option value="">— aucune —</option>
            {questOptions.map((q) => (
              <option key={q.value} value={q.value}>
                {q.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Valide une case du bingo d’équipe (optionnel)
          <select name="cellId" defaultValue={values.cellId}>
            <option value="">— aucune —</option>
            {cellOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="hint">
            En cochant une quête ou une case, tu attestes avoir commencé la lecture après la parution de la grille (ou lu moins de la moitié d’un roman).
          </span>
        </label>
        <label className="field">
          Terminé le
          <input name="finishedAt" type="date" defaultValue={values.finishedAt || today} max={today} />
        </label>

        {state?.error && (
          <p className="flash err">
            <AlertIcon />
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending || !!locked} className="btn lg">
          {pending ? "Enregistrement…" : submitLabel}
        </button>
        {embedded ? (
          <button type="button" onClick={onCancel} className="btn ghost">
            Annuler
          </button>
        ) : (
          <Link href={`${prefix}/books`} className="btn ghost">
            Annuler
          </Link>
        )}
      </form>
    </Shell>
  );
}
