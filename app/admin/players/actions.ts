"use server";

import { withFlash } from "@/lib/actions";
import { userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireOrganizer } from "@/lib/dal";
import { syncMemberRoles } from "@/lib/services/discord-setup";
import { parseForm, type ActionState } from "@/lib/forms";
import { assignUserToTeam, createInvite, deleteInvite, inviteSchema } from "@/lib/services/admin";
import { setMemberRole } from "@/lib/services/membership";

const REVALIDATE = ["/admin", "/home", "/team", "/leaderboard"];
function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/home", "layout");
}

export async function createInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { challenge } = await requireOrganizer();
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
  await requireOrganizer();
  const id = String(formData.get("inviteId") ?? "");
  await withFlash("/admin/players", async () => {
    if (id) await deleteInvite(id);
    return "Invitation supprimée.";
  }, REVALIDATE);
}

export async function assignTeamAction(formData: FormData) {
  const { challenge } = await requireOrganizer();
  const userId = String(formData.get("userId") ?? "");
  const teamId = String(formData.get("teamId") ?? "") || null;
  await withFlash("/admin/players", async () => {
    if (userId) {
      await assignUserToTeam(challenge.id, userId, teamId);
      // Swap the Discord team role (the old one is removed) once the page answered.
      after(() => syncMemberRoles(userId, challenge.id));
    }
    return "Équipe mise à jour.";
  }, REVALIDATE);
}

export async function setRoleAction(formData: FormData) {
  const { user: admin, challenge } = await requireOrganizer();
  const userId = String(formData.get("userId") ?? "");
  const role = formData.get("role") === "ORGANIZER" ? "ORGANIZER" : "PLAYER";
  if (!userId) return;
  if (userId === admin.id && role === "PLAYER") return; // never demote yourself
  await withFlash("/admin/players", async () => {
    await setMemberRole(challenge.id, userId, role);
    after(() => syncMemberRoles(userId, challenge.id));
    return "Rôle mis à jour.";
  }, REVALIDATE);
}
