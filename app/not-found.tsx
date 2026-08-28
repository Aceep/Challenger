import Link from "next/link";
import { Kyle, Meta } from "@/components/ui";
import { ArrowRightIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-5 text-center">
      <Kyle width={90} />
      <h1>Page introuvable</h1>
      <Meta>Kyle a cherché partout : cette page n’existe pas (ou plus).</Meta>
      <Link href="/" className="btn">
        Retour à l’accueil
        <ArrowRightIcon />
      </Link>
    </main>
  );
}
