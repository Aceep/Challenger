import { getActiveChallenge } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { describeEffect, parseEffects } from "@/lib/story/effects";
import { QUORUM } from "@/lib/story/vote";
import { dormantTeams, getStoryAdmin, tiedVotes } from "@/lib/services/story";
import { StoryAdminView, type TeamStoryRow } from "./StoryAdminView";
import { deleteChoiceAction, deleteNodeAction, resetTeamStoryAction, saveChoiceAction, saveNodeAction, saveStoryAction, setStartNodeAction } from "./actions";
import type { EditorStory } from "./StoryEditor";

const actions = { saveStoryAction, saveNodeAction, saveChoiceAction, deleteNodeAction, deleteChoiceAction, setStartNodeAction };

export default async function AdminStoryPage({ searchParams }: PageProps<"/admin/story">) {
  const params = await searchParams;
  const challenge = await getActiveChallenge();
  if (!challenge) return <StoryAdminView story={null} quests={[]} teams={[]} hasChallenge={false} params={params} actions={actions} />;

  const now = new Date();
  const [story, quests, teams, votes, ties, dormant] = await Promise.all([
    getStoryAdmin(challenge.id),
    prisma.quest.findMany({ where: { challengeId: challenge.id, origin: "ADMIN" }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.team.findMany({
      where: { challengeId: challenge.id },
      orderBy: { name: "asc" },
      include: { storyState: { include: { currentNode: { select: { id: true, title: true } } } } },
    }),
    prisma.vote.findMany({ where: { status: { not: "RESOLVED" }, team: { challengeId: challenge.id } }, include: { _count: { select: { ballots: true } } } }),
    tiedVotes(now),
    dormantTeams(7, now),
  ]);

  const questTitle = new Map(quests.map((q) => [q.id, q.title]));

  const rows: TeamStoryRow[] = teams.map((t) => {
    const vote = votes.find((v) => v.teamId === t.id);
    const tie = ties.find((x) => x.teamId === t.id);
    const asleep = dormant.find((d) => d.teamId === t.id);
    const status: TeamStoryRow["status"] = tie
      ? { tone: "wait", label: "égalité" }
      : vote?.status === "AWAITING_TARGET"
        ? { tone: "type", label: "action" }
        : asleep
          ? { tone: "no", label: "dormant" }
          : vote
            ? { tone: "ok", label: `vote · ${vote._count.ballots}/${QUORUM}` }
            : { tone: "type", label: t.storyState ? "en cours" : "pas commencé" };
    return {
      teamId: t.id,
      name: t.name,
      color: t.color,
      chapter: t.storyState?.currentNode.title ?? "pas encore commencé",
      status,
      hasState: !!t.storyState,
    };
  });

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
          voteHours: n.voteHours,
          defaultChoiceId: n.defaultChoiceId,
          teamsHere: n._count.teamStates,
          alerts: [
            ...ties
              .filter((t) => teams.find((x) => x.id === t.teamId)?.storyState?.currentNodeId === n.id)
              .map((t) => ({
                id: `tie-${t.id}`,
                tone: "wait" as const,
                icon: "⚖️",
                text: `${t.teamName} : égalité, cascade au stade ${t.stage === "CAPTAIN" ? "capitaine" : t.stage === "DEPUTY" ? "adjoint·e" : "tous les membres"}${t.pending ? " (un choix attend confirmation)" : ""}. À trancher depuis la page Histoire de l'équipe.`,
              })),
            ...dormant
              .filter((d) => d.nodeId === n.id)
              .map((d) => ({
                id: `dormant-${d.teamId}`,
                tone: "no" as const,
                icon: "📖",
                text: `${teams.find((t) => t.id === d.teamId)?.name ?? "Une équipe"} est bloquée ici depuis 7 jours${d.reason ? ` — ${d.reason}` : ""}.`,
              })),
          ],
          choices: n.choices.map((c) => ({
            id: c.id,
            label: c.label,
            targetNodeId: c.targetNodeId,
            targetTitle: c.target?.title ?? null,
            lockedByQuestId: c.lockedByQuestId,
            lockedByQuestTitle: c.lockedByQuestId ? (questTitle.get(c.lockedByQuestId) ?? null) : null,
            sortOrder: c.sortOrder,
            effects: JSON.stringify(c.effects),
            effectLabels: parseEffects(c.effects).map((e) => describeEffect(e, { self: "l'équipe" })),
          })),
        })),
      }
    : null;

  return (
    <StoryAdminView
      story={editorStory}
      quests={quests}
      teams={rows}
      hasChallenge
      params={params}
      actions={actions}
      resetTeamStoryAction={resetTeamStoryAction}
    />
  );
}
