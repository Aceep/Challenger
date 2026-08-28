import { AdminShell } from "@/components/admin/AdminShell";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { openQuestionsCount } from "@/lib/services/questions";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const challenge = await getActiveChallenge();
  const openQuestions = challenge ? await openQuestionsCount(challenge.id) : 0;
  return (
    <AdminShell who={`${admin.name ?? "admin"} · admin`} openQuestions={openQuestions}>
      {children}
    </AdminShell>
  );
}
