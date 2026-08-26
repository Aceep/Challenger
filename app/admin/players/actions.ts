"use server";

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

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

export async function createInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const challenge = await getActiveChallenge();
  if (!challenge) return { error: "Aucun défi actif : crée-le d'abord." };
  const parsed = parseForm(inviteSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  await createInvite(challenge.id, parsed.data);
  refresh();
  return { success: "Invitation enregistrée." };
}

export async function deleteInviteAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("inviteId") ?? "");
  if (id) await deleteInvite(id);
  refresh();
}

export async function assignTeamAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const teamId = String(formData.get("teamId") ?? "") || null;
  if (userId) await assignUserToTeam(userId, teamId);
  refresh();
}

export async function setRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "PLAYER";
  if (!userId) return;
  if (userId === admin.id && role === "PLAYER") return; // never demote yourself
  await setUserRole(userId, role);
  refresh();
}
