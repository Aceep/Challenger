import { getCurrentPlayer } from "@/lib/dal";
import { cellChoices, lectureQuestChoices } from "@/lib/services/autocomplete";
import { BookForm } from "../BookForm";
import { logBookAction } from "../actions";

export default async function NewBookPage() {
  const { user, team } = await getCurrentPlayer();
  const [quests, cells] = team
    ? await Promise.all([lectureQuestChoices(team.challengeId, user.id, team.id), cellChoices(team.challengeId, team.id)])
    : [[], []];

  return (
    <BookForm
      action={logBookAction}
      title="J'ai fini un livre"
      submitLabel="Enregistrer"
      quests={quests}
      cells={cells}
      values={{ title: "", author: "", pages: "", isGraphic: false, finishedAt: "", questId: "", cellId: "" }}
    />
  );
}
