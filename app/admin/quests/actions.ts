"use server";

import { withFlash } from "@/lib/actions";
import { userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { announceQuest } from "@/lib/discord/events";
import { requireOrganizer } from "@/lib/dal";
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
  const { challenge } = await requireOrganizer();
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
  await requireOrganizer();
  const id = String(formData.get("questId") ?? "");
  await withFlash("/admin/quests", async () => {
    if (id) await deleteQuest(id);
    return "Quête supprimée.";
  }, REVALIDATE);
}

/** An organiser acts for the whole challenge: no team, no captaincy, no Sunday window. */
async function adminActor(): Promise<BookActor> {
  const { user, challenge } = await requireOrganizer();
  return { id: user.id, role: "ORGANIZER", challengeId: challenge.id, teamId: null, isCaptain: false };
}

/** Attaches (or moves) a reading of the team to a quest, as an admin. Bind the page to return to. */
export async function attachQuestBookAction(returnTo: string, formData: FormData) {
  const actor = await adminActor();
  const path = returnTo || "/admin/quests";
  const questId = String(formData.get("questId") ?? "");
  const bookId = String(formData.get("bookId") ?? "");
  await withFlash(path, async () => {
    if (!questId || !bookId) return;
    const result = await updateBook(actor, bookId, { questId });
    return ["Lecture rattachée", describeResult(result, false)].filter(Boolean).join(" · ");
  }, REVALIDATE_PROGRESS);
}

export async function detachQuestBookAction(returnTo: string, formData: FormData) {
  const actor = await adminActor();
  const path = returnTo || "/admin/quests";
  const bookId = String(formData.get("bookId") ?? "");
  await withFlash(path, async () => {
    if (!bookId) return;
    await updateBook(actor, bookId, { questId: null });
    return "Lecture détachée de la quête.";
  }, REVALIDATE_PROGRESS);
}
