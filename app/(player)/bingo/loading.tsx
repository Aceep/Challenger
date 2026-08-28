import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
      <div className="bingo-grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {Array.from({ length: 25 }, (_, i) => (
          <Skeleton key={i} style={{ minHeight: 92, borderRadius: 10 }} />
        ))}
      </div>
    </SkeletonPage>
  );
}
