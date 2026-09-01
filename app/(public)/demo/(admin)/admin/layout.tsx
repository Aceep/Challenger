import { AdminShell } from "@/components/admin/AdminShell";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { KyleGuide } from "@/components/tour/KyleGuide";
import { demoAction } from "@/lib/demo/actions";
import { DEMO_CHALLENGE, DEMO_EDITION_OPTIONS, DEMO_OPEN_QUESTIONS } from "@/lib/demo/data";

export default function DemoAdminLayout({ children }: LayoutProps<"/demo/admin">) {
  return (
    <div className="demo-shell flex min-h-dvh flex-col">
      <DemoBanner tour="admin" />
      <AdminShell
        who="Alycia (démo)"
        edition={{ id: DEMO_CHALLENGE.id, name: DEMO_CHALLENGE.name, color: DEMO_CHALLENGE.color }}
        editions={DEMO_EDITION_OPTIONS}
        switchAction={demoAction.bind(null, "/demo/admin")}
        base="/demo"
        openQuestions={DEMO_OPEN_QUESTIONS}
      >
        {children}
      </AdminShell>
      <KyleGuide base="/demo" />
    </div>
  );
}
