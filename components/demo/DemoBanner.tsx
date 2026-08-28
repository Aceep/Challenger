import Link from "next/link";
import { Kyle } from "@/components/ui/Kyle";

/** Discreet "this is fake data" strip shown on every demo screen. */
export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--line)] bg-[color:var(--hi)] px-4 py-2 text-[13px]">
      <span className="flex items-center gap-2 font-bold">
        <Kyle width={20} />
        Démo — données fictives
      </span>
      <span className="flex items-center gap-3">
        <Link href="/" className="underline">
          Accueil
        </Link>
        <Link href="/login" className="btn small">
          Se connecter avec Discord
        </Link>
      </span>
    </div>
  );
}
