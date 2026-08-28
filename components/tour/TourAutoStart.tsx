"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { TOUR_PARAM, skipKey, tourHref, type TourId } from "@/lib/tour/steps";

export type TourAutoStartProps = { tour: TourId; base: "" | "/demo" };

/**
 * Starts Kyle's visit on its own (first login). Renders nothing: it only
 * rewrites the URL, which is what `<KyleGuide>` listens to. A « Passer » is
 * remembered for the session so the tour never comes back on its own.
 */
export function TourAutoStart(props: TourAutoStartProps) {
  return (
    <Suspense fallback={null}>
      <AutoStart {...props} />
    </Suspense>
  );
}

function AutoStart({ tour, base }: TourAutoStartProps) {
  const router = useRouter();
  const search = useSearchParams();
  const already = search.get(TOUR_PARAM);

  useEffect(() => {
    if (already) return;
    let skipped = false;
    try {
      skipped = sessionStorage.getItem(skipKey(tour)) === "1";
    } catch {
      // Storage blocked: start the visit anyway.
    }
    if (!skipped) router.replace(tourHref(tour, 0, base));
  }, [already, tour, base, router]);

  return null;
}
