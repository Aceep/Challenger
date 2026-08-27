"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { announceRankChange } from "@/lib/discord/events";
import { withLeaderWatch } from "@/lib/services/leaderboard";
import { getCurrentPlayer } from "@/lib/dal";
import { completeQuest, uncompleteQuest } from "@/lib/services/quests";

async function actor() {
  const { user, team } = await getCurrentPlayer();
  return { id: user.id, role: user.role, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id, challengeId: team?.challengeId ?? null };
}

async function watched(challengeId: string | null, fn: () => Promise<unknown>) {
  const { before, after: top } = await withLeaderWatch(challengeId, fn);
  if (challengeId) after(() => announceRankChange(challengeId, before, top));
}

function refresh() {
  revalidatePath("/quests");
  revalidatePath("/");
  revalidatePath("/leaderboard");
}

export async function completeQuestAction(formData: FormData) {
  const questId = String(formData.get("questId") ?? "");
  if (!questId) return;
  const a = await actor();
  await watched(a.challengeId, () => completeQuest(questId, a));
  refresh();
}

export async function uncompleteQuestAction(formData: FormData) {
  const questId = String(formData.get("questId") ?? "");
  if (!questId) return;
  const a = await actor();
  await watched(a.challengeId, () => uncompleteQuest(questId, a));
  refresh();
}
