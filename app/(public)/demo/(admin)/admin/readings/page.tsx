import { ReadingsView } from "@/app/admin/readings/ReadingsView";
import { demoAction } from "@/lib/demo/actions";
import { DEMO_ADMIN_READERS, DEMO_CELL_CHOICES, DEMO_QUEST_CHOICES, DEMO_READINGS_ADMIN, DEMO_TEAMS } from "@/lib/demo/data";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default async function DemoAdminReadingsPage({ searchParams }: PageProps<"/demo/admin/readings">) {
  const params = await searchParams;
  const filters = { teamId: one(params.team), userId: one(params.user), q: one(params.q), deleted: one(params.deleted) === "1" };
  const action = demoAction.bind(null, "/demo/admin/readings");

  const readings = DEMO_READINGS_ADMIN.filter(
    (b) =>
      (!filters.teamId || b.teamId === filters.teamId) &&
      (!filters.userId || b.userId === filters.userId) &&
      (!filters.q || norm(`${b.title} ${b.author}`).includes(norm(filters.q))) &&
      (filters.deleted || !b.deleted),
  );

  const edit = one(params.edit);
  const editing = readings.find((b) => b.id === edit && !b.deleted) ?? null;

  return (
    <ReadingsView
      readings={readings}
      teams={DEMO_TEAMS.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      players={DEMO_ADMIN_READERS}
      filters={filters}
      page={1}
      pages={1}
      total={readings.length}
      hasChallenge
      editing={
        editing && {
          id: editing.id,
          title: editing.title,
          author: editing.author,
          pages: editing.pages,
          coverUrl: editing.coverUrl ?? null,
          type: editing.declaredGraphic ? "GRAPHIQUE" : "ROMAN",
          finishedAt: editing.finishedAt.toISOString().slice(0, 10),
          questId: editing.questId,
          cellId: editing.cellId,
          owner: editing.owner,
          teamName: editing.teamName,
          quests: DEMO_QUEST_CHOICES,
          cells: DEMO_CELL_CHOICES,
          currentQuest: editing.questNumber ? { value: editing.questId, name: `#${editing.questNumber} — quête en cours` } : null,
          currentCell: editing.cellLabel ? { value: editing.cellId, name: `${editing.cellLabel} — case en cours` } : null,
        }
      }
      params={params}
      demo
      updateReadingAction={action}
      deleteReadingAction={action}
    />
  );
}
