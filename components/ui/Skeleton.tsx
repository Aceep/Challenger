import type { CSSProperties } from "react";

/** Shimmering placeholder blocks used by route `loading.tsx` files. */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span className={`skel ${className}`} style={style} aria-hidden />;
}

export function SkeletonLines({ n = 3 }: { n?: number }) {
  return (
    <span className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${88 - (i % 3) * 18}%` }} />
      ))}
    </span>
  );
}

export function SkeletonCard({ lines = 2, height }: { lines?: number; height?: number }) {
  return (
    <div className="card flex flex-col gap-3" style={height ? { minHeight: height } : undefined} aria-hidden>
      <Skeleton className="h-4 w-1/2" />
      <SkeletonLines n={lines} />
    </div>
  );
}

export function SkeletonList({ n = 4, lines = 2 }: { n?: number; lines?: number }) {
  return (
    <div className="list" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}

/** Page-level wrapper: announces loading to assistive tech once. */
export function SkeletonPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={`flex flex-1 flex-col gap-4 p-5 ${className}`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      {children}
    </main>
  );
}
