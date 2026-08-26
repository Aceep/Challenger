"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPlayer } from "@/lib/dal";
import { fillCell, unfillCell, type BingoOwner } from "@/lib/services/bingo";

function ownerFor(scope: string, userId: string, teamId: string | null): BingoOwner {
  if (scope === "TEAM") {
    if (!teamId) throw new Error("Tu n'as pas d'équipe");
    return { scope: "TEAM", teamId };
  }
  return { scope: "PLAYER", userId, teamId };
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
  await fillCell(ownerFor(scope, user.id, team?.id ?? null), team?.id ?? null, cellId, bookId, user.id);
  refresh();
}

export async function unfillCellAction(formData: FormData) {
  const { user, team } = await getCurrentPlayer();
  const cellId = String(formData.get("cellId") ?? "");
  const scope = String(formData.get("scope") ?? "PLAYER");
  if (!cellId) return;
  await unfillCell(ownerFor(scope, user.id, team?.id ?? null), team?.id ?? null, cellId, user.id);
  refresh();
}
