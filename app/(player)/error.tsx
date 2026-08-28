"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function PlayerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-5 text-center">
      <p className="text-4xl">😵</p>
      <h1 className="text-xl font-bold">Oups, quelque chose a cassé</h1>
      <p className="text-sm text-slate-500">
        Réessaie dans un instant. Si ça persiste, préviens un·e admin{error.digest ? ` (réf. ${error.digest.slice(0, 8)})` : ""}.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">
          Réessayer
        </button>
        <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 dark:border-slate-700">
          Accueil
        </Link>
      </div>
    </main>
  );
}
