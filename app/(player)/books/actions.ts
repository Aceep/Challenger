"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { announceRankChange } from "@/lib/discord/events";
import { getCurrentPlayer } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { bookPatchSchema, bookSchema, deleteBook, logBook, updateBook, type BookActor } from "@/lib/services/books";
import { withLeaderWatch } from "@/lib/services/leaderboard";

async function actor(): Promise<{ actor: BookActor; challengeId: string | null }> {
  const { user, team } = await getCurrentPlayer();
  return { actor: { id: user.id, role: user.role, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id }, challengeId: team?.challengeId ?? null };
}

function refresh() {
  for (const p of ["/", "/books", "/leaderboard", "/bingo", "/quests", "/team"]) revalidatePath(p);
}

function summary(r: { points: number; quest: { title: string; complete: boolean } | null; cell: { label: string; complete: boolean } | null }) {
  const parts = [`+${r.points} pts`];
  if (r.quest) parts.push(`quête « ${r.quest.title} » ${r.quest.complete ? "validée" : "à moitié"}`);
  if (r.cell) parts.push(`case ${r.cell.label} ${r.cell.complete ? "complétée" : "à moitié"}`);
  return parts.join(" · ");
}

export async function logBookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { actor: a, challengeId } = await actor();
  const parsed = parseForm(bookSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  let message: string;
  try {
    const { result, before, after: top } = await withLeaderWatch(challengeId, () => logBook(a.id, parsed.data));
    if (challengeId) after(() => announceRankChange(challengeId, before, top));
    message = summary(result);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur" };
  }
  refresh();
  redirect(`/books?added=${encodeURIComponent(message)}`);
}

export async function updateBookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { actor: a, challengeId } = await actor();
  const bookId = String(formData.get("bookId") ?? "");
  formData.delete("bookId");
  // Unchecked checkbox = absent from FormData → explicit false so it can be unset.
  if (!formData.has("isGraphic")) formData.set("isGraphic", "false");
  const parsed = parseForm(bookPatchSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  let message: string;
  try {
    const { result, before, after: top } = await withLeaderWatch(challengeId, () => updateBook(a, bookId, parsed.data));
    if (challengeId) after(() => announceRankChange(challengeId, before, top));
    message = "Livre modifié · " + summary(result);
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
  const { before, after: top } = await withLeaderWatch(challengeId, () => deleteBook(a, bookId));
  if (challengeId) after(() => announceRankChange(challengeId, before, top));
  refresh();
}
