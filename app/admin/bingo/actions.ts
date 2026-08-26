"use server";

import { revalidatePath } from "next/cache";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { deleteGrid, gridSchema, upsertGrid } from "@/lib/services/bingo";

function refresh() {
  revalidatePath("/admin/bingo");
  revalidatePath("/bingo");
}

export async function saveGridAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const challenge = await getActiveChallenge();
  if (!challenge) return { error: "Aucun défi actif." };
  const parsed = parseForm(gridSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    await upsertGrid(challenge.id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
  refresh();
  return { success: "Grille enregistrée." };
}

export async function deleteGridAction(formData: FormData) {
  await requireAdmin();
  const challenge = await getActiveChallenge();
  const scope = formData.get("scope") === "TEAM" ? "TEAM" : "PLAYER";
  if (challenge) await deleteGrid(challenge.id, scope);
  refresh();
}
