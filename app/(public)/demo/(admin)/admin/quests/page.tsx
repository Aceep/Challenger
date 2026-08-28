import { QuestsAdminView, type TeamQuestProgress } from "@/app/admin/quests/QuestsAdminView";
import { DEMO_ADMIN_QUEST_TEAMS, DEMO_ADMIN_QUESTS, DEMO_QUESTS, DEMO_READINGS_ADMIN, DEMO_TEAM, DEMO_TEAMS } from "@/lib/demo/data";
import { demoAction, demoStateAction } from "@/lib/demo/actions";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function DemoAdminQuestsPage({ searchParams }: PageProps<"/demo/admin/quests">) {
  const params = await searchParams;
  const edit = one(params.edit);
  const action = demoAction.bind(null, "/demo/admin/quests");

  // Only Les Renards have a detailed progress in the fixtures.
  const selected = DEMO_TEAMS.find((t) => t.id === one(params.team)) ?? DEMO_TEAM;
  const isDemoTeam = selected.id === DEMO_TEAM.id;
  const teamProgress: TeamQuestProgress = {
    teamId: selected.id,
    teamName: selected.name,
    quests: isDemoTeam
      ? DEMO_QUESTS.map((q) => ({
          id: q.id,
          number: q.number,
          title: q.title,
          points: q.points,
          open: q.open,
          done: q.done,
          progress: q.progress,
          linkedBooks: q.linkedBooks,
        }))
      : [],
    freeBooks: isDemoTeam
      ? DEMO_READINGS_ADMIN.filter((b) => b.teamId === selected.id && !b.deleted && !b.questId).map((b) => ({
          id: b.id,
          label: `${b.owner} — ${b.title}${b.type === "GRAPHIQUE" ? " (½)" : ""}`,
        }))
      : [],
  };

  return (
    <QuestsAdminView
      quests={DEMO_ADMIN_QUESTS}
      teams={DEMO_ADMIN_QUEST_TEAMS}
      hasChallenge
      editingId={edit || null}
      params={params}
      teamProgress={teamProgress}
      demo
      saveQuestAction={demoStateAction}
      deleteQuestAction={action}
      attachQuestBookAction={action}
      detachQuestBookAction={action}
    />
  );
}
