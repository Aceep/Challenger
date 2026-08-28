import { getActiveChallenge, getCurrentPlayer } from "@/lib/dal";
import { listQuestsForTeam } from "@/lib/services/quests";
import { QuestsView } from "./QuestsView";

export default async function QuestsPage() {
  const { team } = await getCurrentPlayer();
  const challenge = team?.challenge ?? (await getActiveChallenge());
  if (!challenge) {
    return <QuestsView quests={[]} hasChallenge={false} hasTeam={false} teamColor="#2E4A7D" />;
  }

  const quests = await listQuestsForTeam(challenge.id, team?.id ?? null);

  return (
    <QuestsView
      quests={quests.map((q) => ({
        id: q.id,
        number: q.number,
        title: q.title,
        description: q.description,
        points: q.points,
        openAt: q.openAt,
        closeAt: q.closeAt,
        open: q.open,
        done: q.done,
        progress: q.done ? 1 : q.progress,
        fromStory: q.origin === "STORY",
        forMyTeam: !!q.targetTeamId,
        linkedBooks: q.linkedBooks,
      }))}
      hasChallenge
      hasTeam={!!team}
      teamColor={team?.color ?? "#2E4A7D"}
    />
  );
}
