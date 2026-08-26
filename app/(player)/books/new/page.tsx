"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logBookAction } from "../actions";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900";

export default function NewBookPage() {
  const [state, action, pending] = useActionState(logBookAction, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <h1 className="text-2xl font-bold">J&apos;ai fini un livre</h1>
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Titre
          <input name="title" required maxLength={200} className={field} autoFocus />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Auteur·ice
          <input name="author" required maxLength={120} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre de pages
          <input name="pages" type="number" inputMode="numeric" min={1} max={5000} required className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Terminé le
          <input name="finishedAt" type="date" defaultValue={today} max={today} className={field} />
        </label>

        {state?.error && (
          <p className="rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-600 py-3 text-lg font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <Link href="/books" className="text-center text-sm text-slate-500 underline">
          Annuler
        </Link>
      </form>
    </main>
  );
}
