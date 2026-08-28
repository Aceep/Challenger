import { Skeleton, SkeletonCard, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="home">
      <div className="page-head">
        <Skeleton className="title w-1/2" />
      </div>
      <div className="score flex flex-col gap-3">
        <Skeleton className="line w-1/3" />
        <Skeleton className="h-14 w-2/5" />
        <Skeleton className="line w-3/5" />
      </div>
      <div className="stat2">
        <SkeletonCard lines={1} />
        <SkeletonCard lines={1} />
      </div>
      <Skeleton className="cta h-12 w-full" style={{ borderRadius: "var(--r-md)" }} />
      <SkeletonCard lines={3} />
    </SkeletonPage>
  );
}
