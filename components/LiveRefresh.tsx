"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches the current server component tree every `seconds` while the tab is visible (never within 5 s of arriving). */
export function LiveRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const mounted = Date.now();
    const tick = () => {
      if (document.visibilityState === "visible" && Date.now() - mounted > 5000) router.refresh();
    };
    const id = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}
