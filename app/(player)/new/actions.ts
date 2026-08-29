"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { userMessage } from "@/lib/errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { createChallengeSchema, upsertChallenge } from "@/lib/services/admin";
import { setCurrentChallengeCookie } from "@/lib/tenancy/cookie";

/**
 * Self-service creation: any signed-in Discord account may open its own
 * challenge and becomes its first organiser (`upsertChallenge`). The edition
 * starts as a draft, and becomes the current one for this browser so the admin
 * desk that follows is already the right edition.
 */
export async function createChallengeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(createChallengeSchema, formData);
  if ("error" in parsed) return { error: parsed.error };

  let id: string;
  try {
    const challenge = await upsertChallenge(null, { ...parsed.data, status: "DRAFT" }, user.id);
    id = challenge.id;
    await setCurrentChallengeCookie(id);
  } catch (e) {
    return { error: userMessage(e) };
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  // Outside the try/catch: `redirect` works by throwing.
  redirect(`/admin/challenge?new=1&ok=${encodeURIComponent("Défi créé ! Voici les prochaines étapes.")}`);
}
