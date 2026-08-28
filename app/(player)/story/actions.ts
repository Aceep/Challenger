"use server";

import { after } from "next/server";
import { withFlash } from "@/lib/actions";
import { getCurrentPlayer } from "@/lib/dal";
import { announceResolution } from "@/lib/discord/events";
import { breakTie, castBallot, chooseTargetTeam, confirmTieBreak } from "@/lib/services/story";

const PATHS = ["/story", "/", "/leaderboard", "/quests"];
const field = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function voteAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const [voteId, choiceId] = [field(formData, "voteId"), field(formData, "choiceId")];
  if (!voteId || !choiceId) return;
  await withFlash("/story", async () => {
    const result = await castBallot(voteId, user.id, choiceId);
    if (result) after(() => announceResolution(result));
    return result ? "Vote enregistré — le vote est clos !" : "Vote enregistré.";
  }, PATHS);
}

export async function chooseTargetAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const [voteId, targetTeamId] = [field(formData, "voteId"), field(formData, "targetTeamId")];
  if (!voteId || !targetTeamId) return;
  await withFlash("/story", async () => {
    const result = await chooseTargetTeam(voteId, user.id, targetTeamId);
    after(() => announceResolution(result));
    return "Cible désignée.";
  }, PATHS);
}

export async function breakTieAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const [voteId, choiceId] = [field(formData, "voteId"), field(formData, "choiceId")];
  if (!voteId || !choiceId) return;
  await withFlash("/story", async () => {
    const result = await breakTie(voteId, user.id, choiceId);
    if (result) after(() => announceResolution(result));
    return result ? "Égalité tranchée." : "Choix proposé, en attente de la confirmation d'un·e admin.";
  }, PATHS);
}

export async function confirmTieAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const voteId = field(formData, "voteId");
  const accept = formData.get("accept") === "1";
  if (!voteId) return;
  await withFlash("/story", async () => {
    const result = await confirmTieBreak(voteId, user.id, accept);
    if (result) after(() => announceResolution(result));
    return accept ? "Choix confirmé." : "Choix refusé.";
  }, PATHS);
}
