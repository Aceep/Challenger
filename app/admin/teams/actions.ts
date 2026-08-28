"use server";

import { withFlash } from "@/lib/actions";
import { GameError, userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { createTeam, deleteTeam, setCaptain, teamSchema, updateTeam } from "@/lib/services/admin";
import { setDeputy } from "@/lib/services/team";

const REVALIDATE = ["/admin", "/home"];
function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/home", "layout");
}

export async function createTeamAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const challenge = await getActiveChallenge();
  if (!challenge) return { error: "Aucun défi actif : crée-le d'abord." };
  const parsed = parseForm(teamSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    await createTeam(challenge.id, parsed.data);
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  return { success: "Équipe créée." };
}

export async function updateTeamAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("teamId") ?? "");
  const parsed = parseForm(teamSchema, formData);
  await withFlash("/admin/teams", async () => {
    if (!id) return;
    if ("error" in parsed) throw new GameError(parsed.error);
    await updateTeam(id, parsed.data);
    return "Équipe enregistrée.";
  }, REVALIDATE);
}

export async function deleteTeamAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("teamId") ?? "");
  await withFlash("/admin/teams", async () => {
    if (id) await deleteTeam(id);
    return "Équipe supprimée.";
  }, REVALIDATE);
}

export async function setCaptainAction(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  const userId = String(formData.get("userId") ?? "") || null;
  await withFlash("/admin/teams", async () => {
    if (teamId) await setCaptain(teamId, userId);
    return "Capitaine mis·e à jour.";
  }, REVALIDATE);
}

export async function setDeputyAction(formData: FormData) {
  const admin = await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  const userId = String(formData.get("userId") ?? "") || null;
  await withFlash("/admin/teams", async () => {
    if (teamId) await setDeputy(teamId, userId, { id: admin.id, role: "ADMIN" });
    return "Adjoint·e mis·e à jour.";
  }, REVALIDATE);
}
