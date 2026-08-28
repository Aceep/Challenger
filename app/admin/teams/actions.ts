"use server";

import { revalidatePath } from "next/cache";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { createTeam, deleteTeam, setCaptain, teamSchema, updateTeam } from "@/lib/services/admin";
import { setDeputy } from "@/lib/services/team";

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

export async function createTeamAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const challenge = await getActiveChallenge();
  if (!challenge) return { error: "Aucun défi actif : crée-le d'abord." };
  const parsed = parseForm(teamSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    await createTeam(challenge.id, parsed.data);
  } catch {
    return { error: "Une équipe porte déjà ce nom." };
  }
  refresh();
  return { success: "Équipe créée." };
}

export async function updateTeamAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("teamId") ?? "");
  const parsed = parseForm(teamSchema, formData);
  if (!id || "error" in parsed) return;
  await updateTeam(id, parsed.data);
  refresh();
}

export async function deleteTeamAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("teamId") ?? "");
  if (id) await deleteTeam(id);
  refresh();
}

export async function setCaptainAction(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  const userId = String(formData.get("userId") ?? "") || null;
  if (teamId) await setCaptain(teamId, userId);
  refresh();
}

export async function setDeputyAction(formData: FormData) {
  const admin = await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  const userId = String(formData.get("userId") ?? "") || null;
  if (teamId) await setDeputy(teamId, userId, { id: admin.id, role: "ADMIN" });
  refresh();
}
