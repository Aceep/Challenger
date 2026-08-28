"use server";

import { withFlash } from "@/lib/actions";
import { userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { createGrid, deleteGrid, gridSchema, moveGrid, updateGrid } from "@/lib/services/bingo";

const REVALIDATE = ["/admin/bingo", "/bingo"];
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
    return { error: userMessage(e) };
  }
  refresh();
  return { success: "Grille enregistrée." };
}

export async function moveGridAction(formData: FormData) {
  await requireAdmin();
  const gridId = String(formData.get("gridId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";
  await withFlash("/admin/bingo", async () => {
    if (gridId) await moveGrid(gridId, direction);
    return "Ordre mis à jour.";
  }, REVALIDATE);
}

export async function deleteGridAction(formData: FormData) {
  await requireAdmin();
  const gridId = String(formData.get("gridId") ?? "");
  await withFlash("/admin/bingo", async () => {
    if (gridId) await deleteGrid(gridId);
    return "Grille supprimée.";
  }, REVALIDATE);
}
