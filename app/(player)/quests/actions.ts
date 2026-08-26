"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPlayer } from "@/lib/dal";
import { completeQuest, uncompleteQuest } from "@/lib/services/quests";

async function actor() {
  const { user, team } = await getCurrentPlayer();
  return { id: user.id, role: user.role, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id };
}

function refresh() {
  revalidatePath("/quests");
  revalidatePath("/");
  revalidatePath("/leaderboard");
}

export async function completeQuestAction(formData: FormData) {
  const questId = String(formData.get("questId") ?? "");
  if (!questId) return;
  await completeQuest(questId, await actor());
  refresh();
}

export async function uncompleteQuestAction(formData: FormData) {
  const questId = String(formData.get("questId") ?? "");
  if (!questId) return;
  await uncompleteQuest(questId, await actor());
  refresh();
}
