import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton className="title w-1/2" />
      <div className="list">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" style={{ borderRadius: "var(--r-md)" }} />
        ))}
      </div>
    </SkeletonPage>
  );
}
