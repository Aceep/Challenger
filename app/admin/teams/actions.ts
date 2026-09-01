"use server";

import { withFlash } from "@/lib/actions";
import { GameError, userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { createTeam, deleteTeam, setCaptain, teamSchema, updateTeam } from "@/lib/services/admin";
import { setDeputy } from "@/lib/services/team";
import { publishTeamGuide } from "@/lib/services/team-guide";

const REVALIDATE = ["/admin", "/home"];
function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/home", "layout");
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
  refresh();
  return { success: "Équipe créée." };
}

export async function updateTeamAction(formData: FormData) {
  const { challenge } = await requireOrganizer();
  const id = String(formData.get("teamId") ?? "");
  const parsed = parseForm(teamSchema, formData);
  await withFlash("/admin/teams", async () => {
    if (!id) return;
    if ("error" in parsed) throw new GameError(parsed.error);
    await updateTeam(challenge.id, id, parsed.data);
    return "Équipe enregistrée.";
  }, REVALIDATE);
}

export async function deleteTeamAction(formData: FormData) {
  const { challenge } = await requireOrganizer();
  const id = String(formData.get("teamId") ?? "");
  await withFlash("/admin/teams", async () => {
    if (id) await deleteTeam(challenge.id, id);
    return "Équipe supprimée.";
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
