import { AdminShell } from "@/components/admin/AdminShell";
import { requireOrganizer } from "@/lib/dal";
import { openQuestionsCount } from "@/lib/services/questions";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, challenge } = await requireOrganizer();
  const openQuestions = await openQuestionsCount(challenge.id);
  return (
    <AdminShell who={`${user.name ?? "organisateur·ice"} · ${challenge.name}`} openQuestions={openQuestions}>
      {children}
    </AdminShell>
  );
}
