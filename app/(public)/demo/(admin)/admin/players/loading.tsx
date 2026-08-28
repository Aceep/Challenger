import { AdminTableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <AdminTableSkeleton rows={6} cols={5} secondary />;
}
