import Link from "next/link";
import { Button, Eyebrow, KyleEmpty, Pill } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { PencilIcon } from "@/components/ui/icons";
import { fmtDelta } from "@/lib/format";
import type { ActionState } from "@/lib/forms";
import { BookEditModal, type BookEditProps } from "./BookEditModal";
import { DeleteBookButton } from "./DeleteBookButton";

export type BookRow = {
  id: string;
  title: string;
  author: string;
  pages: number;
  type: "ROMAN" | "GRAPHIQUE";
  finishedAt: Date;
  points: number;
  owner: string;
  /** The viewer may edit (own reading within 1 h, or captain / admin). */
  editable: boolean;
  /** Shown to the owner while their own edit window is still open. */
  editUntil: Date | null;
  questNumber: number | null;
  questHalf: boolean;
  cellLabel: string | null;
  cellHalf: boolean;
};

export type BooksViewProps = {
  books: BookRow[];
  teamBooks: BookRow[];
  isCaptain: boolean;
  teamColor: string;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  deleteBookAction?: (formData: FormData) => Promise<void>;
  /** Reading open in the edit modal (`?edit=<id>`), null when none. */
  editing?: BookEditProps | null;
  updateBookAction?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** Team-coloured spine, varied per reading so the list stays readable. */
function cover(color: string, index: number) {
  const shades = [
    `linear-gradient(160deg, ${color}, color-mix(in srgb, ${color} 45%, #1A1A1F))`,
    `linear-gradient(160deg, color-mix(in srgb, ${color} 65%, var(--kyle)), ${color})`,
    `linear-gradient(160deg, color-mix(in srgb, ${color} 60%, var(--olive)), ${color})`,
    `linear-gradient(160deg, color-mix(in srgb, ${color} 55%, var(--brick)), ${color})`,
  ];
  return shades[index % shades.length];
}

function Row({ b, index, showOwner, teamColor, prefix, deleteBookAction }: { b: BookRow; index: number; showOwner?: boolean; teamColor: string; prefix: string; deleteBookAction?: (formData: FormData) => Promise<void> }) {
  return (
    <li className="card book">
      <div className="cover" style={{ background: cover(teamColor, index) }} aria-hidden />
      <div className="body">
        <div className="head">
          <p className="t">
            {b.type === "GRAPHIQUE" && <Pill tone="type">graphique</Pill>} {b.title}
            {showOwner && <span className="font-normal text-[color:var(--muted)]"> · {b.owner}</span>}
          </p>
          <p className="pts num">{fmtDelta(b.points)}</p>
        </div>
        <p className="s">
          {b.author} · {b.pages} p. · {dateFmt.format(b.finishedAt)}
        </p>
        {(b.questNumber !== null || b.cellLabel) && (
          <p className="links">
            {b.questNumber !== null && `🗺️ quête #${b.questNumber}${b.questHalf ? " (½)" : ""}`}
            {b.questNumber !== null && b.cellLabel && " · "}
            {b.cellLabel && `🎯 case ${b.cellLabel}${b.cellHalf ? " (½)" : ""}`}
          </p>
        )}
        <div className="foot">
          <span className="note">
            {b.editable ? (b.editUntil ? `modifiable jusqu'à ${timeFmt.format(b.editUntil)}` : "") : "Modification par le·la capitaine uniquement"}
          </span>
          {b.editable && (
            <span className="actions">
              <Link href={`${prefix}/books?edit=${b.id}`} scroll={false} className="icon-btn" title="Modifier" aria-label={`Modifier « ${b.title} »`}>
                <PencilIcon />
              </Link>
              {deleteBookAction && <DeleteBookButton bookId={b.id} title={b.title} points={b.points} hasLinks={b.questNumber !== null || !!b.cellLabel} action={deleteBookAction} />}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/** Readings screen — pure view, reused by /demo. */
export function BooksView({ books, teamBooks, isCaptain, teamColor, params, demo, deleteBookAction, editing, updateBookAction }: BooksViewProps) {
  const prefix = demo ? "/demo" : "";

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <header className="flex items-center justify-between gap-3">
        <h1>Mes lectures</h1>
        <Button href={`${prefix}/books/new`} small>
          + Ajouter
        </Button>
      </header>

      <Flash params={params} />

      <div data-tour="books-list">
        {books.length === 0 ? (
          <KyleEmpty>Aucune lecture pour l&apos;instant. Termine-en une et reviens : Kyle compte les pages.</KyleEmpty>
        ) : (
          <ul className="list">
            {books.map((b, i) => (
              <Row key={b.id} b={b} index={i} teamColor={teamColor} prefix={prefix} deleteBookAction={deleteBookAction} />
            ))}
          </ul>
        )}
      </div>

      <Eyebrow>Lectures de l&apos;équipe (capitaine)</Eyebrow>
      {isCaptain ? (
        teamBooks.length === 0 ? (
          <KyleEmpty>Personne d&apos;autre n&apos;a encore déclaré de lecture.</KyleEmpty>
        ) : (
          <ul className="list">
            {teamBooks.map((b, i) => (
              <Row key={b.id} b={b} index={i} showOwner teamColor={teamColor} prefix={prefix} deleteBookAction={deleteBookAction} />
            ))}
          </ul>
        )
      ) : (
        <KyleEmpty>Tu n&apos;es pas capitaine : seules tes lectures apparaissent ici.</KyleEmpty>
      )}
      {editing && updateBookAction && <BookEditModal edit={editing} prefix={prefix} action={updateBookAction} />}
    </main>
  );
}
