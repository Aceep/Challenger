"use server";

import { revalidatePath } from "next/cache";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import {
  choiceSchema,
  createChoice,
  createNode,
  deleteChoice,
  deleteNode,
  nodeSchema,
  resetTeamStory,
  setStartNode,
  storySchema,
  updateChoice,
  updateNode,
  upsertStory,
} from "@/lib/services/story";

function refresh() {
  revalidatePath("/admin/story");
  revalidatePath("/story");
}

export async function saveStoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const challenge = await getActiveChallenge();
  if (!challenge) return { error: "Aucun défi actif." };
  const parsed = parseForm(storySchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  await upsertStory(challenge.id, parsed.data);
  refresh();
  return { success: "Histoire enregistrée." };
}

export async function saveNodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const storyId = String(formData.get("storyId") ?? "");
  const id = String(formData.get("id") ?? "") || null;
  formData.delete("storyId");
  formData.delete("id");
  const parsed = parseForm(nodeSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  if (id) await updateNode(id, parsed.data);
  else await createNode(storyId, parsed.data);
  refresh();
  return { success: id ? "Chapitre mis à jour." : "Chapitre créé." };
}

export async function deleteNodeAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("nodeId") ?? "");
  if (id) await deleteNode(id);
  refresh();
}

export async function setStartNodeAction(formData: FormData) {
  await requireAdmin();
  const storyId = String(formData.get("storyId") ?? "");
  const nodeId = String(formData.get("nodeId") ?? "");
  if (storyId && nodeId) await setStartNode(storyId, nodeId);
  refresh();
}

export async function saveChoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const nodeId = String(formData.get("nodeId") ?? "");
  const id = String(formData.get("id") ?? "") || null;
  formData.delete("nodeId");
  formData.delete("id");
  const parsed = parseForm(choiceSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  if (id) await updateChoice(id, parsed.data);
  else await createChoice(nodeId, parsed.data);
  refresh();
  return { success: id ? "Choix mis à jour." : "Choix ajouté." };
}

export async function deleteChoiceAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("choiceId") ?? "");
  if (id) await deleteChoice(id);
  refresh();
}

export async function resetTeamStoryAction(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  if (teamId) await resetTeamStory(teamId);
  refresh();
}
