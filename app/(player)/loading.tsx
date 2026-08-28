import { Skeleton, SkeletonList, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton className="title w-2/5" />
      <SkeletonList n={4} />
    </SkeletonPage>
  );
}
