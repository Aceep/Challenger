"use server";

import { withFlash } from "@/lib/actions";
import { userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { createGrid, deleteGrid, gridSchema, moveGrid, updateGrid } from "@/lib/services/bingo";
import { describeResult, updateBook, type BookActor } from "@/lib/services/books";

const REVALIDATE = ["/admin/bingo", "/bingo"];
/** A cell change moves points and quests around: refresh every player screen. */
const REVALIDATE_BOARD = ["/admin/bingo", "/admin/readings", "/bingo", "/books", "/quests", "/team", "/home", "/leaderboard"];
function refresh() {
  revalidatePath("/admin/bingo");
  revalidatePath("/bingo");
}

export async function saveGridAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { challenge } = await requireOrganizer();
  const gridId = String(formData.get("gridId") ?? "") || null;
  formData.delete("gridId");
  const parsed = parseForm(gridSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    if (gridId) await updateGrid(challenge.id, gridId, parsed.data);
    else await createGrid(challenge.id, parsed.data);
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  return { success: "Grille enregistrée." };
}

export async function moveGridAction(formData: FormData) {
  const { challenge } = await requireOrganizer();
  const gridId = String(formData.get("gridId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";
  await withFlash("/admin/bingo", async () => {
    if (gridId) await moveGrid(challenge.id, gridId, direction);
    return "Ordre mis à jour.";
  }, REVALIDATE);
}

export async function deleteGridAction(formData: FormData) {
  const { challenge } = await requireOrganizer();
  const gridId = String(formData.get("gridId") ?? "");
  await withFlash("/admin/bingo", async () => {
    if (gridId) await deleteGrid(challenge.id, gridId);
    return "Grille supprimée.";
  }, REVALIDATE);
}

/** An organiser acts for the whole challenge: no team, no captaincy, no Sunday window. */
async function adminActor(): Promise<BookActor> {
  const { user, challenge } = await requireOrganizer();
  return { id: user.id, role: "ORGANIZER", challengeId: challenge.id, teamId: null, isCaptain: false, isSuperAdmin: user.isSuperAdmin };
}

/** Back to the board of the team being supervised. */
const boardPath = (teamId: string) => (teamId ? `/admin/bingo?team=${encodeURIComponent(teamId)}` : "/admin/bingo");

/** Places (or moves) a reading of the team on one of its cells, as an admin. Bind `teamId`. */
export async function placeTeamBookAction(teamId: string, formData: FormData) {
  const actor = await adminActor();
  const path = boardPath(teamId);
  const cellId = String(formData.get("cellId") ?? "");
  const bookId = String(formData.get("bookId") ?? "");
  await withFlash(path, async () => {
    if (!cellId || !bookId) return;
    const result = await updateBook(actor, bookId, { cellId });
    return ["Lecture placée", describeResult(result, false)].filter(Boolean).join(" · ");
  }, REVALIDATE_BOARD);
}

export async function removeTeamBookAction(teamId: string, formData: FormData) {
  const actor = await adminActor();
  const path = boardPath(teamId);
  const bookId = String(formData.get("bookId") ?? "");
  await withFlash(path, async () => {
    if (!bookId) return;
    const result = await updateBook(actor, bookId, { cellId: null });
    return ["Lecture retirée de la case", describeResult(result, false)].filter(Boolean).join(" · ");
  }, REVALIDATE_BOARD);
}
