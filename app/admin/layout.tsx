import { switchChallengeAction } from "@/app/(player)/help/actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireOrganizer } from "@/lib/dal";
import { listSwitchableChallenges } from "@/lib/services/membership";
import { openQuestionsCount } from "@/lib/services/questions";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, challenge } = await requireOrganizer();
  const [openQuestions, switchable] = await Promise.all([openQuestionsCount(challenge.id), listSwitchableChallenges(user.id)]);

  return (
    <AdminShell
      who={user.name ?? "organisateur·ice"}
      edition={{ id: challenge.id, name: challenge.name, color: challenge.color }}
      editions={switchable.map((s) => ({ id: s.challenge.id, name: s.challenge.name, color: s.challenge.color, status: s.challenge.status, role: s.role }))}
      switchAction={switchChallengeAction}
      openQuestions={openQuestions}
    >
      {children}
    </AdminShell>
  );
}
