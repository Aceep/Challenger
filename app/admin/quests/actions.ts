"use server";

import { withFlash } from "@/lib/actions";
import { userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { announceQuest } from "@/lib/discord/events";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { createQuest, deleteQuest, questSchema, updateQuest } from "@/lib/services/quests";
import { describeResult, updateBook, type BookActor } from "@/lib/services/books";

const REVALIDATE = ["/admin/quests", "/quests"];
/** Attaching a reading moves quest points: refresh every player screen. */
const REVALIDATE_PROGRESS = ["/admin/quests", "/admin/readings", "/quests", "/books", "/bingo", "/team", "/home", "/leaderboard"];
function refresh() {
  revalidatePath("/admin/quests");
  revalidatePath("/quests");
}

export async function saveQuestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const challenge = await getActiveChallenge();
  if (!challenge) return { error: "Aucun défi actif." };
  const id = String(formData.get("id") ?? "") || null;
  formData.delete("id");
  const parsed = parseForm(questSchema, formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    if (id) await updateQuest(id, parsed.data);
    else {
      const quest = await createQuest(challenge.id, parsed.data);
      after(() => announceQuest(quest.id));
    }
  } catch (e) {
    return { error: userMessage(e) };
  }
  refresh();
  return { success: id ? "Quête mise à jour." : "Quête créée." };
}

export async function deleteQuestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("questId") ?? "");
  await withFlash("/admin/quests", async () => {
    if (id) await deleteQuest(id);
    return "Quête supprimée.";
  }, REVALIDATE);
}

/** An admin acts for the whole challenge: no team, no captaincy, no Sunday window. */
async function adminActor(): Promise<BookActor> {
  const admin = await requireAdmin();
  return { id: admin.id, role: "ADMIN", teamId: null, isCaptain: false };
}

/** Back to the progress of the team being supervised. */
const progressPath = (teamId: string) => (teamId ? `/admin/quests?team=${encodeURIComponent(teamId)}` : "/admin/quests");

/** Attaches (or moves) a reading of the team to a quest, as an admin. Bind `teamId`. */
export async function attachQuestBookAction(teamId: string, formData: FormData) {
  const actor = await adminActor();
  const path = progressPath(teamId);
  const questId = String(formData.get("questId") ?? "");
  const bookId = String(formData.get("bookId") ?? "");
  await withFlash(path, async () => {
    if (!questId || !bookId) return;
    const result = await updateBook(actor, bookId, { questId });
    return ["Lecture rattachée", describeResult(result, false)].filter(Boolean).join(" · ");
  }, REVALIDATE_PROGRESS);
}

export async function detachQuestBookAction(teamId: string, formData: FormData) {
  const actor = await adminActor();
  const path = progressPath(teamId);
  const bookId = String(formData.get("bookId") ?? "");
  await withFlash(path, async () => {
    if (!bookId) return;
    await updateBook(actor, bookId, { questId: null });
    return "Lecture détachée de la quête.";
  }, REVALIDATE_PROGRESS);
}
