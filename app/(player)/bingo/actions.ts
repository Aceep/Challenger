"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { announceRankChange } from "@/lib/discord/events";
import { withLeaderWatch } from "@/lib/services/leaderboard";
import { getCurrentPlayer } from "@/lib/dal";
import { fillCell, unfillCell, type BingoOwner } from "@/lib/services/bingo";

function ownerFor(scope: string, userId: string, teamId: string | null): BingoOwner {
  if (scope === "TEAM") {
    if (!teamId) throw new Error("Tu n'as pas d'équipe");
    return { scope: "TEAM", teamId };
  }
  return { scope: "PLAYER", userId, teamId };
}

async function watched(challengeId: string | null | undefined, fn: () => Promise<unknown>) {
  const { before, after: top } = await withLeaderWatch(challengeId, fn);
  if (challengeId) after(() => announceRankChange(challengeId, before, top));
}

function refresh() {
  revalidatePath("/bingo");
  revalidatePath("/");
  revalidatePath("/leaderboard");
}

export async function fillCellAction(formData: FormData) {
  const { user, team } = await getCurrentPlayer();
  const cellId = String(formData.get("cellId") ?? "");
  const bookId = String(formData.get("bookId") ?? "");
  const scope = String(formData.get("scope") ?? "PLAYER");
  if (!cellId || !bookId) return;
  await watched(team?.challengeId, () => fillCell(ownerFor(scope, user.id, team?.id ?? null), team?.id ?? null, cellId, bookId, user.id));
  refresh();
}

export async function unfillCellAction(formData: FormData) {
  const { user, team } = await getCurrentPlayer();
  const cellId = String(formData.get("cellId") ?? "");
  const scope = String(formData.get("scope") ?? "PLAYER");
  if (!cellId) return;
  await watched(team?.challengeId, () => unfillCell(ownerFor(scope, user.id, team?.id ?? null), team?.id ?? null, cellId, user.id));
  refresh();
}
