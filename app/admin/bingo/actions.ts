"use server";

import { revalidatePath } from "next/cache";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { createGrid, deleteGrid, gridSchema, moveGrid, updateGrid } from "@/lib/services/bingo";

function refresh() {
  revalidatePath("/admin/bingo");
  revalidatePath("/bingo");
}

export async function saveGridAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const challenge = await getActiveChallenge();
  if (!challenge) return { error: "Aucun défi actif." };
  const gridId = String(formData.get("gridId") ?? "") || null;
  formData.delete("gridId");
  const parsed = parseForm(gridSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    if (gridId) await updateGrid(gridId, parsed.data);
    else await createGrid(challenge.id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
  refresh();
  return { success: "Grille enregistrée." };
}

export async function moveGridAction(formData: FormData) {
  await requireAdmin();
  const gridId = String(formData.get("gridId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";
  if (gridId) await moveGrid(gridId, direction);
  refresh();
}

export async function deleteGridAction(formData: FormData) {
  await requireAdmin();
  const gridId = String(formData.get("gridId") ?? "");
  if (gridId) await deleteGrid(gridId);
  refresh();
}
