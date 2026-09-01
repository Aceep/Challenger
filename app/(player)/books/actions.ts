"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { announceGridChange, announceRankChange, announceReading } from "@/lib/discord/events";
import { withFlash } from "@/lib/actions";
import { getCurrentPlayer } from "@/lib/dal";
import { userMessage } from "@/lib/errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { bookPatchSchema, bookSchema, deleteBook, describeResult, logBook, updateBook, type BookActor } from "@/lib/services/books";
import { withLeaderWatch } from "@/lib/services/leaderboard";

async function actor(): Promise<{ actor: BookActor; challengeId: string | null; teamId: string | null }> {
  const { user, challenge, role, team } = await getCurrentPlayer();
  const challengeId = challenge?.id ?? null;
  return {
    actor: { id: user.id, role: role ?? "PLAYER", challengeId, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id, isSuperAdmin: user.isSuperAdmin },
    challengeId,
    teamId: team?.id ?? null,
  };
}

const PATHS = ["/home", "/books", "/leaderboard", "/bingo", "/quests", "/team"];
function refresh() {
  for (const p of PATHS) revalidatePath(p);
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
    const detail = describeResult(result, false);
    if (teamId) after(() => announceReading(result.book.id, { kind: "new", points: result.points, detail }));
    message = describeResult(result);
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  redirect(`/books?ok=${encodeURIComponent(message)}`);
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
    const detail = describeResult(result, false);
    if (teamId) after(() => announceReading(result.book.id, { kind: "update", points: result.points, detail }));
    message = ["Lecture modifiée", describeResult(result)].filter(Boolean).join(" · ");
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  redirect(`/books?ok=${encodeURIComponent(message)}`);
}

export async function deleteBookAction(formData: FormData) {
  const { actor: a, challengeId } = await actor();
  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) return;
  await withFlash("/books", async () => {
    const { before, after: top } = await withLeaderWatch(challengeId, () => deleteBook(a, bookId));
    if (challengeId) after(() => announceRankChange(challengeId, before, top));
    return "Lecture supprimée.";
  }, PATHS);
}
