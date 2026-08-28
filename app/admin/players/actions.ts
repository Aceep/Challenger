"use server";

import { withFlash } from "@/lib/actions";
import { userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import {
  assignUserToTeam,
  createInvite,
  deleteInvite,
  inviteSchema,
  setUserRole,
} from "@/lib/services/admin";

const REVALIDATE = ["/admin", "/home", "/team", "/leaderboard"];
function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/home", "layout");
}

export async function createInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const challenge = await getActiveChallenge();
  if (!challenge) return { error: "Aucun défi actif : crée-le d'abord." };
  const parsed = parseForm(inviteSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    await createInvite(challenge.id, parsed.data);
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  return { success: "Invitation enregistrée." };
}

export async function deleteInviteAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("inviteId") ?? "");
  await withFlash("/admin/players", async () => {
    if (id) await deleteInvite(id);
    return "Invitation supprimée.";
  }, REVALIDATE);
}

export async function assignTeamAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const teamId = String(formData.get("teamId") ?? "") || null;
  await withFlash("/admin/players", async () => {
    if (userId) await assignUserToTeam(userId, teamId);
    return "Équipe mise à jour.";
  }, REVALIDATE);
}

export async function setRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "PLAYER";
  if (!userId) return;
  if (userId === admin.id && role === "PLAYER") return; // never demote yourself
  await withFlash("/admin/players", async () => {
    await setUserRole(userId, role);
    return "Rôle mis à jour.";
  }, REVALIDATE);
}
