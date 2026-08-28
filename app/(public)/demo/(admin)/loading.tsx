import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <Skeleton className="h-8 w-1/3" />
      <div className="kpis">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </div>
      <div className="card flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${95 - (i % 4) * 10}%` }} />
        ))}
      </div>
    </div>
  );
}
