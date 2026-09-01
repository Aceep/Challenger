import Image from "next/image";
import Link from "next/link";
import { Avatar, Button, KyleEmpty, PageTitle, Pill, SectionHeading } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { PencilIcon, PlusIcon, QuestIcon, TargetIcon } from "@/components/ui/icons";
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
  /** OpenLibrary cover, when the reading was declared through the web autocomplete. */
  coverUrl?: string | null;
  owner: string;
  /** The viewer may edit (own reading within 1 h, or captain / admin). */
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

function Row({
  b,
  showOwner,
  teamColor,
  prefix,
  deleteBookAction,
}: {
  b: BookRow;
  showOwner?: boolean;
  teamColor: string;
  prefix: string;
  deleteBookAction?: (formData: FormData) => Promise<void>;
}) {
  return (
    <li className="card flat book">
      <span className={`plate num${b.coverUrl ? " has-cover" : ""}`} style={{ background: teamColor }} aria-hidden>
        {b.coverUrl && <Image className="art" src={b.coverUrl} alt="" width={48} height={64} sizes="48px" />}
        <span className="pts">{fmtDelta(b.points)}</span>
        {b.type === "GRAPHIQUE" && <span className="half">½</span>}
      </span>
      <div className="body">
        <p className="t">
          {b.title}
          {b.type === "GRAPHIQUE" && <Pill tone="type">graphique</Pill>}
        </p>
        <p className="meta">
          par <span className="accent">{b.author}</span>
          {showOwner && (
            <>
              {" "}
              <Avatar name={b.owner} color={teamColor} size={20} /> {b.owner}
            </>
          )}
        </p>
        <p className="meta row">
          <span>{b.pages} p.</span>
          <span>{dateFmt.format(b.finishedAt)}</span>
        </p>
        {(b.questNumber !== null || b.cellLabel) && (
          <p className="links">
            {b.questNumber !== null && (
              <span>
                <QuestIcon className="ico-sm" />
                quête #{b.questNumber}
                {b.questHalf ? " ½" : ""}
              </span>
            )}
            {b.cellLabel && (
              <span>
                <TargetIcon className="ico-sm" />
                case {b.cellLabel}
                {b.cellHalf ? " ½" : ""}
              </span>
            )}
          </p>
        )}
        <div className="foot">
          <span className="note">
            {b.editable ? (b.editUntil ? `modifiable jusqu’à ${timeFmt.format(b.editUntil)}` : "") : "Modification par le·la capitaine uniquement"}
          </span>
          {b.editable && (
            <span className="actions">
              <Link href={`${prefix}/books?edit=${b.id}`} scroll={false} className="icon-btn" title="Modifier" aria-label={`Modifier « ${b.title} »`}>
                <PencilIcon />
              </Link>
              {deleteBookAction && (
                <DeleteBookButton bookId={b.id} title={b.title} points={b.points} hasLinks={b.questNumber !== null || !!b.cellLabel} action={deleteBookAction} />
              )}
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
    <main className="flex flex-1 flex-col gap-6 p-5">
      <PageTitle
        action={
          <Button href={`${prefix}/books/new`} size="sm">
            <PlusIcon />
            Ajouter
          </Button>
        }
      >
        Mes lectures
      </PageTitle>

      <Flash params={params} />

      <div data-tour="books-list">
        {books.length === 0 ? (
          <KyleEmpty>Aucune lecture pour l’instant. Termine-en une et reviens : Kyle compte les pages.</KyleEmpty>
        ) : (
          <ul className="list">
            {books.map((b) => (
              <Row key={b.id} b={b} teamColor={teamColor} prefix={prefix} deleteBookAction={deleteBookAction} />
            ))}
          </ul>
        )}
      </div>

      <section className="section">
        <SectionHeading action={isCaptain ? <Pill tone="type">capitaine</Pill> : undefined}>Lectures de l’équipe</SectionHeading>
        {isCaptain ? (
          teamBooks.length === 0 ? (
            <KyleEmpty>Personne d’autre n’a encore déclaré de lecture.</KyleEmpty>
          ) : (
            <ul className="list">
              {teamBooks.map((b) => (
                <Row key={b.id} b={b} showOwner teamColor={teamColor} prefix={prefix} deleteBookAction={deleteBookAction} />
              ))}
            </ul>
          )
        ) : (
          <KyleEmpty>Tu n’es pas capitaine : seules tes lectures apparaissent ici.</KyleEmpty>
        )}
      </section>
      {editing && updateBookAction && <BookEditModal edit={editing} prefix={prefix} action={updateBookAction} />}
    </main>
  );
}
