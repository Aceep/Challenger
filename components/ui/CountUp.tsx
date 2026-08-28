"use client";

import { useEffect, useRef } from "react";
import { fmtPoints } from "@/lib/format";

/** Counts from 0 to `value` in ~700 ms on mount by writing the DOM directly (instant when reduced motion is preferred). */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    const dur = 700;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmtPoints(Math.round(value * eased * 10) / 10);
      if (t < 1) raf = requestAnimationFrame(step);
      else el.textContent = fmtPoints(value);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span ref={ref}>{fmtPoints(value)}</span>;
}
