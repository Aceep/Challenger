"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Kyle } from "@/components/ui/Kyle";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-5 text-center">
      <Kyle width={90} />
      <h1>Oups, quelque chose a cassé</h1>
      <p className="text-sm text-[color:var(--muted)]">
        Réessaie dans un instant{error.digest ? ` (réf. ${error.digest.slice(0, 8)})` : ""}.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn">
          Réessayer
        </button>
        <Link href="/admin" className="btn ghost">
          Tableau de bord
        </Link>
      </div>
    </main>
  );
}
