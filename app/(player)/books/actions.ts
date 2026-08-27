"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { announceRankChange } from "@/lib/discord/events";
import { withLeaderWatch } from "@/lib/services/leaderboard";
import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { bookSchema, deleteBook, logBook } from "@/lib/services/books";

export async function logBookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, team } = await getCurrentPlayer();
  const parsed = parseForm(bookSchema, formData);
  if ("error" in parsed) return { error: parsed.error };

  const { result, before, after: top } = await withLeaderWatch(team?.challengeId, () => logBook(user.id, parsed.data));
  if (team) after(() => announceRankChange(team.challengeId, before, top));
  const { points } = result;
  revalidatePath("/");
  revalidatePath("/books");
  revalidatePath("/leaderboard");
  redirect(`/books?added=${points}`);
}

export async function deleteBookAction(formData: FormData) {
  const { user, team } = await getCurrentPlayer();
  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) return;
  const { before, after: top } = await withLeaderWatch(team?.challengeId, () => deleteBook(user.id, bookId));
  if (team) after(() => announceRankChange(team.challengeId, before, top));
  revalidatePath("/");
  revalidatePath("/books");
  revalidatePath("/leaderboard");
}
