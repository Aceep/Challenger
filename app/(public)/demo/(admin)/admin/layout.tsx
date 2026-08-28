import { AdminShell } from "@/components/admin/AdminShell";
import { DemoBanner } from "@/components/demo/DemoBanner";

export default function DemoAdminLayout({ children }: LayoutProps<"/demo/admin">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <AdminShell who="Alycia · admin (démo)" base="/demo">
        {children}
      </AdminShell>
    </div>
  );
}
