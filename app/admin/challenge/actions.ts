"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { challengeSchema, upsertChallenge } from "@/lib/services/admin";

export async function saveChallengeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  formData.delete("id");
  const parsed = parseForm(challengeSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  await upsertChallenge(id, parsed.data);
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { success: "Défi enregistré." };
}
