"use client";

import { useEffect, useRef } from "react";

/** A short, quiet burst in the brand colours (skipped when the user prefers reduced motion). */
export function Confetti({ duration = 1800 }: { duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);
    const colors = ["#FFD84A", "#F5C400", "#7C9A2B", "#2E4A7D", "#FFFFFF"];
    const parts = Array.from({ length: 90 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h * 0.25,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (-8 - Math.random() * 8) * dpr,
      r: (3 + Math.random() * 4) * dpr,
      c: colors[Math.floor(Math.random() * colors.length)],
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.3,
    }));
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0, 1 - t / duration);
      for (const p of parts) {
        p.vy += 0.35 * dpr;
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        ctx.restore();
      }
      if (t < duration) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);
  return <canvas ref={ref} className="confetti" aria-hidden />;
}
