"use server";

import { withFlash } from "@/lib/actions";
import { requireUser } from "@/lib/dal";
import { GameError } from "@/lib/errors";
import { listSwitchableChallenges } from "@/lib/services/membership";
import { setCurrentChallengeCookie } from "@/lib/tenancy/cookie";
import { switchLanding } from "@/lib/tenancy/select";

/** Everything on screen belongs to the edition: revalidate both shells. */
const PATHS = ["/", "/admin"];

/**
 * Writes the `challenge` cookie after checking the target is open to the person
 * (`listSwitchableChallenges`, the same list the switcher offers). The caller
 * asks where to land; `switchLanding` caps it to what the new role allows.
 */
export async function switchChallengeAction(formData: FormData) {
  const user = await requireUser();
  const challengeId = String(formData.get("challengeId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");

  const target = (await listSwitchableChallenges(user.id)).find((s) => s.challenge.id === challengeId);
  if (!target) {
    return withFlash(
      "/home",
      async () => {
        throw new GameError("Cette édition ne t’est pas ouverte.");
      },
      PATHS,
    );
  }

  await setCurrentChallengeCookie(target.challenge.id);

  return withFlash(switchLanding(target.role, returnTo), async () => `Tu es maintenant sur « ${target.challenge.name} ».`, PATHS);
}
