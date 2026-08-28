import { AdminShell } from "@/components/admin/AdminShell";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DEMO_OPEN_QUESTIONS } from "@/lib/demo/data";

export default function DemoAdminLayout({ children }: LayoutProps<"/demo/admin">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <AdminShell who="Alycia · admin (démo)" base="/demo" openQuestions={DEMO_OPEN_QUESTIONS}>
        {children}
      </AdminShell>
    </div>
  );
}
