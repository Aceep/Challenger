import { QuestsAdminView } from "@/app/admin/quests/QuestsAdminView";
import { DEMO_ADMIN_QUESTS, DEMO_ADMIN_QUEST_TEAMS } from "@/lib/demo/data";
import { demoAction, demoStateAction } from "@/lib/demo/actions";

export default async function DemoAdminQuestsPage({ searchParams }: PageProps<"/demo/admin/quests">) {
  const params = await searchParams;
  const edit = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  return (
    <QuestsAdminView
      quests={DEMO_ADMIN_QUESTS}
      teams={DEMO_ADMIN_QUEST_TEAMS}
      hasChallenge
      editingId={edit ?? null}
      params={params}
      demo
      saveQuestAction={demoStateAction}
      deleteQuestAction={demoAction.bind(null, "/demo/admin/quests")}
    />
  );
}
