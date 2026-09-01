import Link from "next/link";
import { Kyle } from "@/components/ui/Kyle";
import { SparkIcon } from "@/components/ui/icons";
import { tourHref, type TourId } from "@/lib/tour/steps";

/**
 * Discreet "this is fake data" strip shown on every demo screen. It is also the
 * only way back to the site, so it follows the scroll (`.demo-bar`, sticky).
 */
export function DemoBanner({ tour }: { tour?: TourId }) {
  return (
    <div className="demo-bar flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--line)] bg-[color:var(--hi)] px-4 py-2 text-[13px]">
      <span className="flex items-center gap-2 font-bold">
        <Kyle width={20} />
        Démo — données fictives
      </span>
      <span className="flex items-center gap-3">
        {tour && (
          <Link href={tourHref(tour, 0, "/demo")} className="inline-flex items-center gap-1.5 underline">
            <SparkIcon className="ico-sm" />
            Visite guidée
          </Link>
        )}
        <Link href="/" className="underline">
          Accueil
        </Link>
        <Link href="/login" className="btn sm">
          Se connecter avec Discord
        </Link>
      </span>
    </div>
  );
}
