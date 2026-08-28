"use server";

import { withFlash } from "@/lib/actions";
import { userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { announceQuest } from "@/lib/discord/events";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { createQuest, deleteQuest, questSchema, updateQuest } from "@/lib/services/quests";

const REVALIDATE = ["/admin/quests", "/quests"];
function refresh() {
  revalidatePath("/admin/quests");
  revalidatePath("/quests");
}

export async function saveQuestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const challenge = await getActiveChallenge();
  if (!challenge) return { error: "Aucun défi actif." };
  const id = String(formData.get("id") ?? "") || null;
  formData.delete("id");
  const parsed = parseForm(questSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    if (id) await updateQuest(id, parsed.data);
    else {
      const quest = await createQuest(challenge.id, parsed.data);
      after(() => announceQuest(quest.id));
    }
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  return { success: id ? "Quête mise à jour." : "Quête créée." };
}

export async function deleteQuestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("questId") ?? "");
  await withFlash("/admin/quests", async () => {
    if (id) await deleteQuest(id);
    return "Quête supprimée.";
  }, REVALIDATE);
}
