import { requireUser } from "@/lib/dal";
import { defaultDatesFor } from "@/lib/tenancy/new-challenge";
import { createChallengeAction } from "./actions";
import { NewChallengeView } from "./NewChallengeView";

/** `/new` — open to any signed-in account, membership or not. */
export default async function NewChallengePage() {
  await requireUser();
  const { startAt, endAt } = defaultDatesFor();

  return (
    <NewChallengeView
      defaults={{ startAt: startAt.toISOString().slice(0, 10), endAt: endAt.toISOString().slice(0, 10) }}
      action={createChallengeAction}
    />
  );
}
