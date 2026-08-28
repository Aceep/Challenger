"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { announceGridChange, announceRankChange } from "@/lib/discord/events";
import { getCurrentPlayer } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { bookPatchSchema, bookSchema, deleteBook, describeResult, logBook, updateBook, type BookActor } from "@/lib/services/books";
import { withLeaderWatch } from "@/lib/services/leaderboard";

async function actor(): Promise<{ actor: BookActor; challengeId: string | null; teamId: string | null }> {
  const { user, team } = await getCurrentPlayer();
  return { actor: { id: user.id, role: user.role, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id }, challengeId: team?.challengeId ?? null, teamId: team?.id ?? null };
}

function refresh() {
  for (const p of ["/", "/books", "/leaderboard", "/bingo", "/quests", "/team"]) revalidatePath(p);
}

export async function logBookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { actor: a, challengeId, teamId } = await actor();
  const parsed = parseForm(bookSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  let message: string;
  try {
    const { result, before, after: top } = await withLeaderWatch(challengeId, () => logBook(a, parsed.data));
    if (challengeId) after(() => announceRankChange(challengeId, before, top));
    if (teamId && result.cell?.grid) after(() => announceGridChange(teamId, result.cell!.grid!));
    message = describeResult(result);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur" };
  }
  refresh();
  redirect(`/books?added=${encodeURIComponent(message)}`);
}

export async function updateBookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { actor: a, challengeId, teamId } = await actor();
  const bookId = String(formData.get("bookId") ?? "");
  formData.delete("bookId");
  const parsed = parseForm(bookPatchSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  let message: string;
  try {
    const { result, before, after: top } = await withLeaderWatch(challengeId, () => updateBook(a, bookId, parsed.data));
    if (challengeId) after(() => announceRankChange(challengeId, before, top));
    if (teamId && result.cell?.grid) after(() => announceGridChange(teamId, result.cell!.grid!));
    message = ["Lecture modifiée", describeResult(result)].filter(Boolean).join(" · ");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur" };
  }
  refresh();
  redirect(`/books?added=${encodeURIComponent(message)}`);
}

export async function deleteBookAction(formData: FormData): Promise<void> {
  const { actor: a, challengeId } = await actor();
  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) return;
  try {
    const { before, after: top } = await withLeaderWatch(challengeId, () => deleteBook(a, bookId));
    if (challengeId) after(() => announceRankChange(challengeId, before, top));
  } catch (e) {
    refresh();
    redirect(`/books?error=${encodeURIComponent(e instanceof Error ? e.message : "Erreur")}`);
  }
  refresh();
}
