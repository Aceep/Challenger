"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { announceGridChange, announceRankChange } from "@/lib/discord/events";
import { getCurrentPlayer } from "@/lib/dal";
import { updateBook, type BookActor, type BookResult } from "@/lib/services/books";
import { withLeaderWatch } from "@/lib/services/leaderboard";

function refresh() {
  for (const p of ["/bingo", "/", "/leaderboard", "/books", "/team"]) revalidatePath(p);
}

async function run(fn: (actor: BookActor) => Promise<BookResult>) {
  const { user, team } = await getCurrentPlayer();
  const actor: BookActor = { id: user.id, role: user.role, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id };
  try {
    const { result, before, after: top } = await withLeaderWatch(team?.challengeId, () => fn(actor));
    if (team) after(() => announceRankChange(team.challengeId, before, top));
    if (team && result.cell?.grid) after(() => announceGridChange(team.id, result.cell!.grid!));
  } catch (e) {
    refresh();
    redirect(`/bingo?error=${encodeURIComponent(e instanceof Error ? e.message : "Erreur")}`);
  }
  refresh();
}

/** Places a book on a cell (moves it if already placed). */
export async function placeBookAction(formData: FormData) {
  const cellId = String(formData.get("cellId") ?? "");
  const bookId = String(formData.get("bookId") ?? "");
  if (!cellId || !bookId) return;
  await run((actor) => updateBook(actor, bookId, { cellId }));
}

export async function removeBookAction(formData: FormData) {
  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) return;
  await run((actor) => updateBook(actor, bookId, { cellId: null }));
}
