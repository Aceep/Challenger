import { prisma } from "@/lib/db";
import { getActiveChallenge } from "@/lib/dal";
import { getStoryAdmin } from "@/lib/services/story";
import { NodeForm, NodeList, StoryForm, type EditorStory } from "./StoryEditor";
import { resetTeamStoryAction } from "./actions";

export default async function AdminStoryPage() {
  const challenge = await getActiveChallenge();
  if (!challenge) {
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Histoire</h1>
        <p className="text-slate-500">Active un défi pour écrire l&apos;histoire.</p>
      </main>
    );
  }

  const [story, quests, teams] = await Promise.all([
    getStoryAdmin(challenge.id),
    prisma.quest.findMany({ where: { challengeId: challenge.id, origin: "ADMIN" }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.team.findMany({ where: { challengeId: challenge.id }, orderBy: { name: "asc" }, include: { storyState: { include: { currentNode: { select: { title: true } } } } } }),
  ]);

  const editorStory: EditorStory | null = story
    ? {
        id: story.id,
        title: story.title,
        voteHours: story.voteHours,
        startNodeId: story.startNodeId,
        nodes: story.nodes.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          sortOrder: n.sortOrder,
          requiredQuestId: n.requiredQuestId,
          requiredBingoLines: n.requiredBingoLines,
          requiredPoints: n.requiredPoints,
          teamsHere: n._count.teamStates,
          choices: n.choices.map((c) => ({
            id: c.id,
            label: c.label,
            targetNodeId: c.targetNodeId,
            targetTitle: c.target?.title ?? null,
            lockedByQuestId: c.lockedByQuestId,
            sortOrder: c.sortOrder,
            effects: JSON.stringify(c.effects),
          })),
        })),
      }
    : null;

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Histoire</h1>
      <StoryForm story={editorStory} />

      {editorStory && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Nouveau chapitre</h2>
            <NodeForm storyId={editorStory.id} quests={quests} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Chapitres ({editorStory.nodes.length})</h2>
            {editorStory.nodes.length === 0 ? <p className="text-sm text-slate-500">Aucun chapitre. Le premier créé devient le début.</p> : <NodeList story={editorStory} quests={quests} />}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">Progression des équipes</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {teams.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-slate-900">
                  <span>
                    <strong>{t.name}</strong> — {t.storyState?.currentNode.title ?? "pas encore commencé"}
                  </span>
                  {t.storyState && (
                    <form action={resetTeamStoryAction}>
                      <input type="hidden" name="teamId" value={t.id} />
                      <button className="text-red-600 underline">Remettre au début</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
