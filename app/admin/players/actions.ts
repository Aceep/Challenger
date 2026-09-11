"use server";

import { withFlash } from "@/lib/actions";
import { userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireOrganizer } from "@/lib/dal";
import { searchGuildMembers } from "@/lib/discord/rest";
import { syncMemberRoles } from "@/lib/services/discord-setup";
import { parseForm, type ActionState } from "@/lib/forms";
import { assignUserToTeam, deleteInvite, inviteSchema } from "@/lib/services/admin";
import { inviteMembers, notifyAndSync } from "@/lib/services/invites";
import { setMemberRole } from "@/lib/services/membership";
import type { MemberHit } from "./MemberPicker";

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
    // Même service que `/inviter` sur Discord : une invitation, un MP, et
    // l'adhésion tout de suite pour qui a déjà un compte.
    const result = await inviteMembers(challenge.id, { discordIds: [parsed.data.discordId], teamId: parsed.data.teamId ?? null, role: parsed.data.role });
    after(() => notifyAndSync(result));
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  return { success: "Invitation enregistrée — Kyle prévient la personne en message privé." };
}

/**
 * Le sélecteur de membre du formulaire d'invitation : Discord cherche dans les
 * membres du serveur de l'édition (aucun intent privilégié pour cette route) et
 * l'on renvoie de quoi afficher une liste — jamais l'objet Discord brut.
 * Sans serveur relié, la réponse est vide et le formulaire retombe sur la
 * saisie d'un identifiant.
 */
export async function searchMembersAction(query: string): Promise<MemberHit[]> {
  const { challenge } = await requireOrganizer();
  const q = query.trim();
  if (!challenge.discordGuildId || q.length < 2) return [];
  const found = await searchGuildMembers(challenge.discordGuildId, q);
  if (!found.ok) return [];
  return found.data
    .filter((m) => m.user && !m.user.bot)
    .map((m) => ({ id: m.user!.id, label: m.user!.global_name || m.user!.username || m.user!.id, sub: m.nick ?? undefined }));
}

export async function deleteInviteAction(formData: FormData) {
  const { challenge } = await requireOrganizer();
  const id = String(formData.get("inviteId") ?? "");
  await withFlash("/admin/players", async () => {
    if (id) await deleteInvite(challenge.id, id);
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
