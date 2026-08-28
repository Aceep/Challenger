"use server";

import { requireUser } from "@/lib/dal";
import { markOnboarded } from "@/lib/services/onboarding";

/** Called when Kyle's first-login visit ends (finished or skipped). */
export async function markOnboardedAction() {
  const user = await requireUser();
  await markOnboarded(user.id);
}
