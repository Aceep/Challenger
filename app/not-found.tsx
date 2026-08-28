import Link from "next/link";
import { Kyle } from "@/components/ui/Kyle";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-5 text-center">
      <Kyle width={90} />
      <h1>Page introuvable</h1>
      <p className="text-sm text-[color:var(--muted)]">Kyle a cherché partout : cette page n&apos;existe pas (ou plus).</p>
      <Link href="/" className="btn">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
