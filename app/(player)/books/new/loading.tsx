import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

/** Mirrors BookForm: title, seven labelled fields, primary button, cancel link. */
export default function Loading() {
  const widths = ["100%", "100%", "40%", "100%", "100%", "100%", "45%"];
  return (
    <SkeletonPage>
      <Skeleton className="title w-3/5" />
      <div className="flex flex-col gap-4" aria-hidden>
        {widths.map((w, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="line w-1/3" />
            <Skeleton className="h-11" style={{ width: w, borderRadius: "var(--r-sm)" }} />
          </div>
        ))}
        <Skeleton className="h-12 w-full" style={{ borderRadius: "var(--r-md)" }} />
        <Skeleton className="mx-auto h-11 w-full" style={{ borderRadius: "var(--r-md)" }} />
      </div>
    </SkeletonPage>
  );
}
