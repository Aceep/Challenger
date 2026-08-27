"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getCurrentPlayer } from "@/lib/dal";
import { announceResolution } from "@/lib/discord/events";
import { castBallot, chooseTargetTeam } from "@/lib/services/story";

function refresh() {
  revalidatePath("/story");
  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/quests");
}

export async function voteAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const voteId = String(formData.get("voteId") ?? "");
  const choiceId = String(formData.get("choiceId") ?? "");
  if (!voteId || !choiceId) return;
  const result = await castBallot(voteId, user.id, choiceId);
  if (result) after(() => announceResolution(result));
  refresh();
}

export async function chooseTargetAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const voteId = String(formData.get("voteId") ?? "");
  const targetTeamId = String(formData.get("targetTeamId") ?? "");
  if (!voteId || !targetTeamId) return;
  const result = await chooseTargetTeam(voteId, user.id, targetTeamId);
  after(() => announceResolution(result));
  refresh();
}
