import { switchChallengeAction } from "@/app/(player)/help/actions";
import { markOnboardedAction } from "@/app/(player)/home/actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { PwaBootstrap } from "@/components/pwa/PwaBootstrap";
import { KyleGuide } from "@/components/tour/KyleGuide";
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
      <PwaBootstrap />
      {/* No auto-start here: the organiser's visit opens on demand, from
          « Revoir la visite » or from the `?tour=admin` a fresh edition lands on. */}
      <KyleGuide base="" onFinish={markOnboardedAction} />
    </AdminShell>
  );
}
