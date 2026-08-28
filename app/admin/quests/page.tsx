import { Flash } from "@/components/Flash";
import { prisma } from "@/lib/db";
import { getActiveChallenge } from "@/lib/dal";
import { listQuestsAdmin } from "@/lib/services/quests";
import { QuestForm } from "./QuestForm";
import { QuestList } from "./QuestList";

const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function AdminQuestsPage({ searchParams }: PageProps<"/admin/quests">) {
  const params = await searchParams;
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
      <Flash params={params} />
      {!challenge ? (
        <p className="text-slate-500">Active un défi pour créer des quêtes.</p>
      ) : (
        <>
          <section>
            <h2 className="mb-2 font-semibold">Nouvelle quête</h2>
            <p className="mb-2 text-sm text-slate-500">Les quêtes sont collectives : une équipe valide une quête en y rattachant un roman, ou deux graphiques.</p>
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
                  number: q.number,
                  title: q.title,
                  description: q.description,
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
