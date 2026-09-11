"use server";

import { withFlash } from "@/lib/actions";
import { GameError, userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireOrganizer } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { createTeam, deleteTeam, setCaptain, teamSchema, updateTeam } from "@/lib/services/admin";
import { setupGuild } from "@/lib/services/discord-setup";
import { setDeputy } from "@/lib/services/team";
import { publishTeamGuide } from "@/lib/services/team-guide";

const REVALIDATE = ["/admin", "/home"];
function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/home", "layout");
}

/**
 * A team created or renamed on the site must exist — and be correctly named —
 * on Discord, without anyone having to remember to press « Configurer ». Only
 * once the server is actually wired (`discordAdminRoleId`), and in `after()`:
 * the bootstrap talks to Discord for a good second, and only creates or renames
 * what does not match, so it is safe to fire on every write.
 */
function wireDiscord(challenge: { id: string; discordAdminRoleId: string | null }) {
  if (!challenge.discordAdminRoleId) return;
  after(async () => {
    try {
      await setupGuild(challenge.id);
    } catch (e) {
      console.error("[discord] câblage des équipes", e);
    }
  });
}

export async function createTeamAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { challenge } = await requireOrganizer();
  const parsed = parseForm(teamSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    await createTeam(challenge.id, parsed.data);
  } catch (e) {
    return { error: userMessage(e) };
  }
  wireDiscord(challenge);
  refresh();
  return { success: challenge.discordAdminRoleId ? "Équipe créée — son rôle et ses salons Discord arrivent." : "Équipe créée." };
}

export async function updateTeamAction(formData: FormData) {
  const { challenge } = await requireOrganizer();
  const id = String(formData.get("teamId") ?? "");
  const parsed = parseForm(teamSchema, formData);
  await withFlash("/admin/teams", async () => {
    if (!id) return;
    if ("error" in parsed) throw new GameError(parsed.error);
    await updateTeam(challenge.id, id, parsed.data);
    wireDiscord(challenge);
    return challenge.discordAdminRoleId ? "Équipe enregistrée — son rôle et sa catégorie Discord suivent." : "Équipe enregistrée.";
  }, REVALIDATE);
}

export async function deleteTeamAction(formData: FormData) {
  const { challenge } = await requireOrganizer();
  const id = String(formData.get("teamId") ?? "");
  await withFlash("/admin/teams", async () => {
    if (id) await deleteTeam(challenge.id, id);
    // Deliberately nothing on Discord: a salon may hold a conversation worth
    // keeping, and deleting one is the kind of gesture nobody can undo.
    return challenge.discordAdminRoleId ? "Équipe supprimée — son rôle et ses salons Discord restent, à supprimer à la main." : "Équipe supprimée.";
  }, REVALIDATE);
}

export async function setCaptainAction(formData: FormData) {
  const { challenge } = await requireOrganizer();
  const teamId = String(formData.get("teamId") ?? "");
  const userId = String(formData.get("userId") ?? "") || null;
  await withFlash("/admin/teams", async () => {
    if (teamId) await setCaptain(challenge.id, teamId, userId);
    return "Capitaine mis·e à jour.";
  }, REVALIDATE);
}

/** Publishes — or refreshes — the pinned guide card of the team's librairie salon. */
export async function publishGuideAction(formData: FormData) {
  const { challenge } = await requireOrganizer();
  const teamId = String(formData.get("teamId") ?? "");
  await withFlash("/admin/teams", async () => {
    if (!teamId) return;
    const r = await publishTeamGuide(challenge.id, teamId);
    return r.status === "edited" ? "Guide mis à jour dans la librairie." : "Guide publié et épinglé dans la librairie.";
  }, REVALIDATE);
}

export async function setDeputyAction(formData: FormData) {
  const { user: admin } = await requireOrganizer();
  const teamId = String(formData.get("teamId") ?? "");
  const userId = String(formData.get("userId") ?? "") || null;
  await withFlash("/admin/teams", async () => {
    if (teamId) await setDeputy(teamId, userId, admin.id);
    return "Adjoint·e mis·e à jour.";
  }, REVALIDATE);
}
