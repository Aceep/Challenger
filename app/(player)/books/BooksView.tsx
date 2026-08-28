import Link from "next/link";
import { Button, Eyebrow, KyleEmpty, Pill } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { fmtDelta } from "@/lib/format";

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
      <div className="min-w-0">
        <p className="t">
          {b.type === "GRAPHIQUE" && <Pill tone="type">graphique</Pill>} {b.title}
          {showOwner && <span className="font-normal text-[color:var(--muted)]"> · {b.owner}</span>}
        </p>
        <p className="s truncate">
          {b.author} · {b.pages} p. · {dateFmt.format(b.finishedAt)}
        </p>
        {(b.questNumber !== null || b.cellLabel) && (
          <p className="links truncate">
            {b.questNumber !== null && `🗺️ quête #${b.questNumber}${b.questHalf ? " (½)" : ""}`}
            {b.questNumber !== null && b.cellLabel && " · "}
            {b.cellLabel && `🎯 case ${b.cellLabel}${b.cellHalf ? " (½)" : ""}`}
          </p>
        )}
        <div className="actions">
          {b.editable ? (
            <>
              <Link href={`${prefix}/books/${b.id}/edit`}>Modifier</Link>
              {deleteBookAction && (
                <form action={deleteBookAction}>
                  <input type="hidden" name="bookId" value={b.id} />
                  <button className="text-[color:var(--brick)]">Supprimer</button>
                </form>
              )}
              {b.editUntil && <span>modifiable jusqu&apos;à {timeFmt.format(b.editUntil)}</span>}
            </>
          ) : (
            <span>Modification par le·la capitaine uniquement</span>
          )}
        </div>
      </div>
      <p className="pts num">{fmtDelta(b.points)}</p>
    </li>
  );
}

/** Readings screen — pure view, reused by /demo. */
export function BooksView({ books, teamBooks, isCaptain, teamColor, params, demo, deleteBookAction }: BooksViewProps) {
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

      {books.length === 0 ? (
        <KyleEmpty>Aucune lecture pour l&apos;instant. Termine-en une et reviens : Kyle compte les pages.</KyleEmpty>
      ) : (
        <ul className="list">
          {books.map((b, i) => (
            <Row key={b.id} b={b} index={i} teamColor={teamColor} prefix={prefix} deleteBookAction={deleteBookAction} />
          ))}
        </ul>
      )}

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
    </main>
  );
}
