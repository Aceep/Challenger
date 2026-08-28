"use server";

import { withFlash } from "@/lib/actions";
import { requireOrganizer } from "@/lib/dal";
import { GameError } from "@/lib/errors";
import { parseForm } from "@/lib/forms";
import { bookPatchSchema, deleteBook, describeResult, updateBook, type BookActor } from "@/lib/services/books";

/** Every player screen that shows points, links or the ledger. */
const REVALIDATE = ["/admin/readings", "/admin", "/books", "/bingo", "/quests", "/team", "/home", "/leaderboard"];

/** An organiser acts for the whole challenge: no team, no captaincy, no Sunday window. */
async function adminActor(): Promise<BookActor> {
  const { user, challenge } = await requireOrganizer();
  return { id: user.id, role: "ORGANIZER", challengeId: challenge.id, teamId: null, isCaptain: false };
}

/** Keeps the current filters (`?team=…&q=…`) when redirecting back to the table. */
function backPath(formData: FormData) {
  const back = String(formData.get("back") ?? "");
  return back ? `/admin/readings?${back}` : "/admin/readings";
}

export async function updateReadingAction(formData: FormData) {
  const actor = await adminActor();
  const path = backPath(formData);
  const bookId = String(formData.get("bookId") ?? "");
  formData.delete("bookId");
  formData.delete("back");
  if (!String(formData.get("finishedAt") ?? "")) formData.delete("finishedAt");
  const parsed = parseForm(bookPatchSchema, formData);
  await withFlash(
    path,
    async () => {
      if (!bookId) return;
      if ("error" in parsed) throw new GameError(parsed.error);
      const result = await updateBook(actor, bookId, parsed.data);
      return ["Lecture modifiée", describeResult(result)].filter(Boolean).join(" · ");
    },
    REVALIDATE,
  );
}

export async function deleteReadingAction(formData: FormData) {
  const actor = await adminActor();
  const path = backPath(formData);
  const bookId = String(formData.get("bookId") ?? "");
  await withFlash(
    path,
    async () => {
      if (bookId) await deleteBook(actor, bookId);
      return "Lecture supprimée : points annulés, quête et case libérées.";
    },
    REVALIDATE,
  );
}
