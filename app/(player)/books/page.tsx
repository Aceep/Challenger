import Link from "next/link";
import { getCurrentPlayer } from "@/lib/dal";
import { cellLabel } from "@/lib/services/bingo";
import { listBooks, listTeamBooks } from "@/lib/services/books";
import { deleteBookAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default async function BooksPage({ searchParams }: PageProps<"/books">) {
  const { user, team } = await getCurrentPlayer();
  const { added } = await searchParams;
  const actor = { id: user.id, role: user.role, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id };
  const [books, teamBooks] = await Promise.all([listBooks(user.id, actor), actor.isCaptain && team ? listTeamBooks(team.id, user.id) : []]);
  const now = new Date();

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes lectures</h1>
        <Link href="/books/new" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
          + Ajouter
        </Link>
      </header>

      {added !== undefined && (
        <p className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          {Array.isArray(added) ? added[0] : added} 🎉
        </p>
      )}

      {books.length === 0 ? (
        <p className="text-slate-500">Aucun livre pour l&apos;instant. Termine-en un et reviens !</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {books.map((b) => (
            <li key={b.id} className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {b.isGraphic && <span className="mr-1 rounded bg-pink-100 px-1 text-[10px] font-medium uppercase text-pink-800 dark:bg-pink-950 dark:text-pink-200">graphique</span>}
                    {b.title}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {b.author} · {b.pages} p. · {dateFmt.format(b.finishedAt)}
                  </p>
                  {(b.questBook || b.bingoFill) && (
                    <p className="truncate text-xs text-indigo-700 dark:text-indigo-300">
                      {b.questBook && `🗺️ ${b.questBook.quest.title}`}
                      {b.questBook && b.bingoFill && " · "}
                      {b.bingoFill && `🎯 case ${cellLabel(b.bingoFill.cell.row, b.bingoFill.cell.col)}`}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-bold text-indigo-600">{b.points >= 0 ? "+" : ""}{b.points}</span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                {b.editable ? (
                  <>
                    <Link href={`/books/${b.id}/edit`} className="underline">
                      Modifier
                    </Link>
                    <form action={deleteBookAction}>
                      <input type="hidden" name="bookId" value={b.id} />
                      <button className="text-red-600 underline">Supprimer</button>
                    </form>
                    {b.userId === user.id && !actor.isCaptain && b.editUntil > now && (
                      <span className="text-slate-400">modifiable jusqu&apos;à {timeFmt.format(b.editUntil)}</span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">Modification par le·la capitaine uniquement</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {teamBooks.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Livres de l&apos;équipe (capitaine)</h2>
          <ul className="flex flex-col gap-2">
            {teamBooks.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {b.title} <span className="font-normal text-slate-500">· {b.user.name}</span>
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {b.author} · {b.pages} p.{b.isGraphic ? " · graphique" : ""}
                  </p>
                </div>
                <Link href={`/books/${b.id}/edit`} className="text-xs underline">
                  Modifier
                </Link>
                <form action={deleteBookAction}>
                  <input type="hidden" name="bookId" value={b.id} />
                  <button className="text-xs text-red-600 underline">Supprimer</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
