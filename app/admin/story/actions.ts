"use server";

import { withFlash } from "@/lib/actions";
import { userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/dal";
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

const REVALIDATE = ["/admin/story", "/story"];
function refresh() {
  revalidatePath("/admin/story");
  revalidatePath("/story");
}

export async function saveStoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { challenge } = await requireOrganizer();
  const parsed = parseForm(storySchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    await upsertStory(challenge.id, parsed.data);
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  return { success: "Histoire enregistrée." };
}

export async function saveNodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOrganizer();
  const storyId = String(formData.get("storyId") ?? "");
  const id = String(formData.get("id") ?? "") || null;
  formData.delete("storyId");
  formData.delete("id");
  const parsed = parseForm(nodeSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    if (id) await updateNode(id, parsed.data);
    else await createNode(storyId, parsed.data);
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  return { success: id ? "Chapitre mis à jour." : "Chapitre créé." };
}

export async function deleteNodeAction(formData: FormData) {
  await requireOrganizer();
  const id = String(formData.get("nodeId") ?? "");
  await withFlash("/admin/story", async () => {
    if (id) await deleteNode(id);
    return "Chapitre supprimé.";
  }, REVALIDATE);
}

export async function setStartNodeAction(formData: FormData) {
  await requireOrganizer();
  const storyId = String(formData.get("storyId") ?? "");
  const nodeId = String(formData.get("nodeId") ?? "");
  await withFlash("/admin/story", async () => {
    if (storyId && nodeId) await setStartNode(storyId, nodeId);
    return "Chapitre de départ défini.";
  }, REVALIDATE);
}

export async function saveChoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireOrganizer();
  const nodeId = String(formData.get("nodeId") ?? "");
  const id = String(formData.get("id") ?? "") || null;
  formData.delete("nodeId");
  formData.delete("id");
  const parsed = parseForm(choiceSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    if (id) await updateChoice(id, parsed.data);
    else await createChoice(nodeId, parsed.data);
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  return { success: id ? "Choix mis à jour." : "Choix ajouté." };
}

export async function deleteChoiceAction(formData: FormData) {
  await requireOrganizer();
  const id = String(formData.get("choiceId") ?? "");
  await withFlash("/admin/story", async () => {
    if (id) await deleteChoice(id);
    return "Choix supprimé.";
  }, REVALIDATE);
}

export async function resetTeamStoryAction(formData: FormData) {
  await requireOrganizer();
  const teamId = String(formData.get("teamId") ?? "");
  await withFlash("/admin/story", async () => {
    if (teamId) await resetTeamStory(teamId);
    return "Équipe renvoyée au début de l'histoire.";
  }, REVALIDATE);
}
