import "server-only";
import { prisma } from "@/lib/db";
import { affectedRecipients, affectedTeams, awaitingTargetRecipients, tieStageRecipients } from "@/lib/push/audience";
import {
  awaitingTargetPayload,
  effectsOnYouPayload,
  playerRepliedPayload,
  questionAnsweredPayload,
  questionAskedPayload,
  tiePendingPayload,
  tieStagePayload,
  voteOpenedPayload,
  voteResolvedPayload,
} from "@/lib/push/payload";
import { withoutActor } from "@/lib/push/recipients";
import { organizerIds } from "@/lib/services/membership";
import { notifyUsers } from "@/lib/services/push";
import { teamAudienceIds } from "@/lib/services/team";
import type { ResolutionSummary } from "@/lib/services/story";
import type { TieStage } from "@/lib/story/vote";

/**
 * One function per thing worth a notification.
 *
 * Three rules shape this file:
 * - **it is called from the services, never from an action or a route.** The
 *   web form and the Discord slash command go through the same service, so the
 *   notification is written once and both paths send it.
 * - **the caller passes ids, not rows.** Every function loads what it needs
 *   itself, so a hook point costs one line and holds nothing in memory until
 *   the response has been sent (`pushLater`).
 * - **it never raises.** A row that vanished between the write and the send is
 *   a silent return; anything else is caught by `pushLater`. A notification is
 *   a courtesy — it must never undo the vote or the answer that caused it.
 *
 * It imports `story.ts` for a *type* only (erased at build): `story.ts` imports
 * this file for real, and the two would otherwise form a cycle. Everything else
 * is queried straight from Prisma here for the same reason.
 */

/** A vote just opened: the team and its allies have until the deadline. */
export async function notifyVoteOpened(voteId: string): Promise<void> {
  const vote = await prisma.vote.findUnique({
    where: { id: voteId },
    select: { id: true, teamId: true, deadline: true, node: { select: { title: true } } },
  });
  if (!vote) return;
  const audience = await teamAudienceIds(vote.teamId);
  await notifyUsers(audience, voteOpenedPayload({ voteId: vote.id, chapterTitle: vote.node.title, deadline: vote.deadline }));
}

/**
 * The chapter is played. The team hears what it chose and where it lands; the
 * teams its effects landed on hear that instead, and are pointed at `/team`
 * where the points, the modifier or the new quest actually show up.
 */
export async function notifyVoteResolved(summary: ResolutionSummary): Promise<void> {
  // A resolution still waiting for a rival team is announced by
  // `notifyAwaitingTarget`; nothing has been applied yet.
  if (summary.awaitingTarget) return;

  const audience = await teamAudienceIds(summary.teamId);
  await notifyUsers(audience, voteResolvedPayload({ voteId: summary.voteId, choiceLabel: summary.choiceLabel, nextChapterTitle: summary.nextTitle }));

  const hit = affectedTeams(summary);
  if (hit.length === 0 || summary.effects.length === 0) return;
  const members = (await Promise.all(hit.map((id) => teamAudienceIds(id)))).flat();
  const recipients = affectedRecipients(members, audience);
  if (recipients.length === 0) return;
  await notifyUsers(recipients, effectsOnYouPayload({ voteId: summary.voteId, teamName: summary.teamName, summary: summary.effects.join(" ; ") }));
}

/** The choice won but it needs a rival: the captain has to name one. */
export async function notifyAwaitingTarget(voteId: string): Promise<void> {
  const vote = await prisma.vote.findUnique({
    where: { id: voteId },
    select: { id: true, resultChoice: { select: { label: true } }, team: { select: { captainId: true, deputyId: true } } },
  });
  if (!vote?.resultChoice) return;
  const recipients = awaitingTargetRecipients(vote.team);
  if (recipients.length === 0) return;
  await notifyUsers(recipients, awaitingTargetPayload({ voteId: vote.id, choiceLabel: vote.resultChoice.label }));
}

/** The tie moved down the cascade: captain, then deputy, then anybody. */
export async function notifyTieStage(voteId: string, stage: TieStage): Promise<void> {
  const vote = await prisma.vote.findUnique({
    where: { id: voteId },
    select: { id: true, teamId: true, team: { select: { captainId: true, deputyId: true } } },
  });
  if (!vote) return;
  // Only the last stage needs the whole list — no point querying it before.
  const audience = stage === "ANY" ? await teamAudienceIds(vote.teamId) : [];
  const recipients = tieStageRecipients(vote.team, stage, audience);
  if (recipients.length === 0) return;
  await notifyUsers(recipients, tieStagePayload({ voteId: vote.id, stage }));
}

/** A member broke the tie: an organiser has to confirm the pick. */
export async function notifyTiePending(voteId: string): Promise<void> {
  const vote = await prisma.vote.findUnique({
    where: { id: voteId },
    select: { id: true, pendingChoiceId: true, team: { select: { name: true, challengeId: true } } },
  });
  if (!vote?.pendingChoiceId) return;
  const choice = await prisma.storyChoice.findUnique({ where: { id: vote.pendingChoiceId }, select: { label: true } });
  if (!choice) return;
  const recipients = await organizerIds(vote.team.challengeId);
  if (recipients.length === 0) return;
  await notifyUsers(recipients, tiePendingPayload({ voteId: vote.id, teamName: vote.team.name, choiceLabel: choice.label }));
}

/** Somebody opened a question — on the site or with `/question`. */
export async function notifyQuestionAsked(questionId: string, actorId: string): Promise<void> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, title: true, challengeId: true, author: { select: { name: true } } },
  });
  if (!question) return;
  const recipients = withoutActor(await organizerIds(question.challengeId), actorId);
  if (recipients.length === 0) return;
  await notifyUsers(recipients, questionAskedPayload({ questionId: question.id, title: question.title, authorName: question.author.name }));
}

/**
 * The organisation answered. `messageText` is passed in rather than re-read:
 * the answer may have been typed in Discord and imported in the same breath,
 * and the caller is the one that knows which message is the new one.
 */
export async function notifyQuestionAnswered(questionId: string, messageText: string): Promise<void> {
  const question = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true, title: true, authorId: true } });
  if (!question) return;
  await notifyUsers([question.authorId], questionAnsweredPayload({ questionId: question.id, title: question.title, excerpt: messageText }));
}

/** A player added something to a thread: the organisation should have a look. */
export async function notifyPlayerReplied(questionId: string, actorId: string): Promise<void> {
  const question = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true, title: true, challengeId: true } });
  if (!question) return;
  const recipients = withoutActor(await organizerIds(question.challengeId), actorId);
  if (recipients.length === 0) return;
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
  await notifyUsers(recipients, playerRepliedPayload({ questionId: question.id, title: question.title, authorName: actor?.name ?? null }));
}
