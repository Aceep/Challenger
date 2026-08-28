"use server";

import { after } from "next/server";
import { withFlash } from "@/lib/actions";
import { announceGridChange, announceRankChange } from "@/lib/discord/events";
import { getCurrentPlayer } from "@/lib/dal";
import { describeResult, updateBook, type BookActor, type BookResult } from "@/lib/services/books";
import { withLeaderWatch } from "@/lib/services/leaderboard";

const PATHS = ["/bingo", "/", "/leaderboard", "/books", "/team"];

async function run(fn: (actor: BookActor) => Promise<BookResult>, okLabel: string) {
  const { user, team } = await getCurrentPlayer();
  const actor: BookActor = { id: user.id, role: user.role, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id };
  await withFlash("/bingo", async () => {
    const { result, before, after: top } = await withLeaderWatch(team?.challengeId, () => fn(actor));
    if (team) after(() => announceRankChange(team.challengeId, before, top));
    if (team && result.cell?.grid) after(() => announceGridChange(team.id, result.cell!.grid!));
    return [okLabel, describeResult(result, false)].filter(Boolean).join(" · ");
  }, PATHS);
}

/** Places a reading on a cell (moves it if already placed). */
export async function placeBookAction(formData: FormData) {
  const cellId = String(formData.get("cellId") ?? "");
  const bookId = String(formData.get("bookId") ?? "");
  if (!cellId || !bookId) return;
  await run((actor) => updateBook(actor, bookId, { cellId }), "Lecture placée");
}

export async function removeBookAction(formData: FormData) {
  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) return;
  await run((actor) => updateBook(actor, bookId, { cellId: null }), "Lecture retirée de la case");
}
