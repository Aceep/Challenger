import { AdminShell } from "@/components/admin/AdminShell";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { KyleGuide } from "@/components/tour/KyleGuide";

export default function DemoAdminLayout({ children }: LayoutProps<"/demo/admin">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner tour="admin" />
      <AdminShell who="Alycia · admin (démo)" base="/demo">
        {children}
      </AdminShell>
      <KyleGuide base="/demo" />
    </div>
  );
}
