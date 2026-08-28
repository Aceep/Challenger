import { DashboardView } from "@/app/admin/DashboardView";
import { DEMO_DASHBOARD } from "@/lib/demo/data";

export default function DemoAdminHome() {
  return <DashboardView {...DEMO_DASHBOARD} demo />;
}
