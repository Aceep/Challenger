import { prisma } from "@/lib/db";
import { getActiveChallenge } from "@/lib/dal";
import { listQuestsAdmin } from "@/lib/services/quests";
import { QuestForm } from "./QuestForm";
import { QuestList } from "./QuestList";

const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function AdminQuestsPage() {
  const challenge = await getActiveChallenge();
  const [quests, teams] = challenge
    ? await Promise.all([
        listQuestsAdmin(challenge.id),
        prisma.team.findMany({ where: { challengeId: challenge.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      ])
    : [[], []];

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Quêtes</h1>
      {!challenge ? (
        <p className="text-slate-500">Active un défi pour créer des quêtes.</p>
      ) : (
        <>
          <section>
            <h2 className="mb-2 font-semibold">Nouvelle quête</h2>
            <QuestForm teams={teams} />
          </section>
          <section>
            <h2 className="mb-2 font-semibold">Quêtes ({quests.length})</h2>
            {quests.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune quête.</p>
            ) : (
              <QuestList
                teams={teams}
                quests={quests.map((q) => ({
                  id: q.id,
                  title: q.title,
                  description: q.description,
                  type: q.type,
                  kind: q.kind,
                  points: q.points,
                  openAt: toLocalInput(q.openAt),
                  closeAt: toLocalInput(q.closeAt),
                  targetTeamId: q.targetTeamId ?? "",
                  targetTeamName: q.targetTeam?.name ?? null,
                  completions: q._count.completions,
                  origin: q.origin,
                }))}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}
