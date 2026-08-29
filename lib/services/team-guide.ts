import "server-only";
import { prisma } from "@/lib/db";
import { guideCard, GUIDE_BUTTON_LABEL } from "@/lib/discord/cards";
import { bookId } from "@/lib/discord/components";
import { editMessageResult, pinMessage, postMessage } from "@/lib/discord/rest";
import { GameError } from "@/lib/errors";
import { assertTeamOf } from "@/lib/services/admin";

/**
 * The pinned guide card of a team's *librairie* salon.
 *
 * Re-runnable by design: the idempotency mark is `Team.discordGuideMessageId`
 * (a real pointer to the message), not a `BotEvent` that would forbid ever
 * refreshing the copy. Republishing edits the message in place; if an organiser
 * deleted it in Discord, it is posted and pinned again.
 */
export type GuidePublication = {
  status: "posted" | "edited" | "reposted";
  channelId: string;
  messageId: string;
};

/** Posts (or refreshes) the pinned guide card of a team's librairie salon. */
export async function publishTeamGuide(challengeId: string, teamId: string): Promise<GuidePublication> {
  await assertTeamOf(challengeId, teamId);

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true, color: true, discordChannelId: true, discordLibraryChannelId: true, discordGuideMessageId: true },
  });
  if (!team) throw new GameError("Équipe introuvable.");

  const channelId = team.discordLibraryChannelId;
  if (!channelId) throw new GameError("Cette équipe n’a pas encore de salon librairie : configure le serveur Discord d’abord.");

  const message = {
    embeds: [guideCard(team)],
    rows: [{ buttons: [{ customId: bookId("new"), label: GUIDE_BUTTON_LABEL, style: 1 as const }] }],
  };

  if (team.discordGuideMessageId) {
    const r = await editMessageResult(channelId, team.discordGuideMessageId, message);
    if (r === "ok") return { status: "edited", channelId, messageId: team.discordGuideMessageId };
    // « failed » is a transient error: re-posting would leave two pinned guides.
    if (r === "failed") throw new GameError("Discord n’a pas répondu, réessaie dans un instant.");
  }

  const messageId = await postMessage(channelId, message);
  if (!messageId) throw new GameError("Le message n’a pas pu être publié : vérifie les permissions du bot sur le salon.");
  // Best-effort: already pinned, or the 50-pin cap is reached.
  await pinMessage(channelId, messageId);
  await prisma.team.update({ where: { id: teamId }, data: { discordGuideMessageId: messageId } });

  return { status: team.discordGuideMessageId ? "reposted" : "posted", channelId, messageId };
}
