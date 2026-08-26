import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { listBooks } from "@/lib/services/books";
import { deleteBookAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export default async function BooksPage({ searchParams }: PageProps<"/books">) {
  const user = await requireUser();
  const { added } = await searchParams;
  const books = await listBooks(user.id);

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
          Livre enregistré : +{added} pts pour ton équipe 🎉
        </p>
      )}

      {books.length === 0 ? (
        <p className="text-slate-500">Aucun livre pour l&apos;instant. Termine-en un et reviens !</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {books.map((b) => {
            const pts = b.pointEvents.reduce((n, e) => n + e.amount, 0);
            return (
              <li key={b.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.title}</p>
                  <p className="truncate text-sm text-slate-500">
                    {b.author} · {b.pages} p. · {dateFmt.format(b.finishedAt)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-indigo-600">+{pts}</span>
                <form action={deleteBookAction}>
                  <input type="hidden" name="bookId" value={b.id} />
                  <button className="text-slate-400 hover:text-red-600" aria-label="Supprimer" title="Supprimer">
                    ✕
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
