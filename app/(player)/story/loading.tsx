import { Skeleton, SkeletonLines, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="story">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-7 w-3/4" />
      <div className="card">
        <SkeletonLines n={6} />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" style={{ borderRadius: 14 }} />
      ))}
    </SkeletonPage>
  );
}
