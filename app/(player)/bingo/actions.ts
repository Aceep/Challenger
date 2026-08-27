"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { announceRankChange } from "@/lib/discord/events";
import { getCurrentPlayer } from "@/lib/dal";
import { updateBook, type BookActor } from "@/lib/services/books";
import { withLeaderWatch } from "@/lib/services/leaderboard";

function refresh() {
  for (const p of ["/bingo", "/", "/leaderboard", "/books", "/team"]) revalidatePath(p);
}

async function run(fn: (actor: BookActor) => Promise<unknown>) {
  const { user, team } = await getCurrentPlayer();
  const actor: BookActor = { id: user.id, role: user.role, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id };
  const { before, after: top } = await withLeaderWatch(team?.challengeId, () => fn(actor));
  if (team) after(() => announceRankChange(team.challengeId, before, top));
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
