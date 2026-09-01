"use server";

import { withFlash } from "@/lib/actions";
import { GameError, userMessage } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { requireOrganizer, requireUser } from "@/lib/dal";
import { parseForm, type ActionState } from "@/lib/forms";
import { challengeSchema, createChallengeSchema, upsertChallenge, type ChallengeInput } from "@/lib/services/admin";
import { setupGuild } from "@/lib/services/discord-setup";

export async function saveChallengeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "") || null;
  // Editing an edition needs to organise *that* edition; creating one only needs an account.
  const { user } = id ? await requireOrganizer(id) : await requireUser().then((u) => ({ user: u }));
  formData.delete("id");

  // Creating goes through the same narrow door as `/new`: only an account is
  // required, so a forged `status` or `discordGuildId` must never be read here —
  // it would open an ACTIVE edition on somebody else's Discord server.
  let input: ChallengeInput;
  if (id) {
    const parsed = parseForm(challengeSchema, formData);
    if ("error" in parsed) return { error: parsed.error };
    input = parsed.data;
  } else {
    const parsed = parseForm(createChallengeSchema, formData);
    if ("error" in parsed) return { error: parsed.error };
    input = { ...parsed.data, status: "DRAFT" };
  }

  try {
    await upsertChallenge(id, input, user.id);
  } catch (e) {
    return { error: userMessage(e) };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/home", "layout");
  return { success: "Défi enregistré." };
}

/**
 * Creates (or completes) the Discord server: roles, salons, permissions,
 * slash commands, member roles and Kyle's pinned welcome.
 * Resumable — a second run only reports what was already in place.
 */
export async function setupDiscordAction(formData: FormData) {
  const challengeId = String(formData.get("challengeId") ?? "");
  if (challengeId) await requireOrganizer(challengeId);
  await withFlash(
    "/admin/challenge",
    async () => {
      if (!challengeId) throw new GameError("Enregistre d'abord le défi.");
      const s = await setupGuild(challengeId);
      const parts = [
        `${s.created.length} créé${s.created.length > 1 ? "s" : ""}`,
        `${s.skipped.length} déjà en place`,
        `${s.rolesAssigned} rôle${s.rolesAssigned > 1 ? "s" : ""} attribué${s.rolesAssigned > 1 ? "s" : ""}`,
        `${s.welcomed} message${s.welcomed > 1 ? "s" : ""} d'accueil`,
      ];
      const warn = s.errors.length ? ` — ⚠️ ${s.errors.length} erreur${s.errors.length > 1 ? "s" : ""} : ${s.errors.join(" ; ")}` : "";
      return `Discord configuré : ${parts.join(", ")}.${warn}`;
    },
    ["/admin/challenge", "/admin", "/admin/teams"],
  );
}
