import { DashboardView } from "@/app/admin/DashboardView";
import { DEMO_DASHBOARD } from "@/lib/demo/data";

export default async function DemoAdminHome({ searchParams }: PageProps<"/demo/admin">) {
  return <DashboardView {...DEMO_DASHBOARD} params={await searchParams} demo />;
}
