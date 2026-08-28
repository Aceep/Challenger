import { getCurrentPlayer } from "@/lib/dal";
import { VERIFICATION_MESSAGE } from "@/lib/scoring/books";
import { cellChoices, questChoices } from "@/lib/services/autocomplete";
import { isVerificationWindow } from "@/lib/time/paris";
import { BookForm } from "../BookForm";
import { logBookAction } from "../actions";

export default async function NewBookPage() {
  const { user, team } = await getCurrentPlayer();
  const [quests, cells] = team ? await Promise.all([questChoices(team.challengeId, team.id), cellChoices(team.id)]) : [[], []];
  const locked = user.role !== "ADMIN" && isVerificationWindow(new Date()) ? VERIFICATION_MESSAGE : null;

  return (
    <BookForm
      action={logBookAction}
      title="J'ai fini une lecture"
      submitLabel="Enregistrer"
      quests={quests}
      cells={cells}
      locked={locked}
      values={{ title: "", author: "", pages: "", type: "ROMAN", finishedAt: "", questId: "", cellId: "" }}
    />
  );
}
