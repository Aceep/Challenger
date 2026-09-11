import type { TieStage } from "@/lib/story/vote";
import { uniqueIds } from "./recipients";

/**
 * Who, among the people a story event concerns, actually gets the push.
 *
 * The service layer knows how to *load* a team, its allies and its organisers;
 * it should not also hold the rules « the captain first », « never tell the same
 * person twice about the same vote ». Those rules live here, pure and tested, so
 * the hook points in `lib/services/story.ts` stay one line long.
 */

/** A team as far as the tie cascade is concerned. */
export type TieLeadership = { captainId: string | null; deputyId: string | null };

/**
 * The tie cascade, as a recipient list. The stage says who may break the tie
 * right now, so it also says whose phone should ring: the captain, then the
 * deputy, then — once anybody may act — the whole team and its allies.
 *
 * A team without a captain (or without a deputy) simply gets nobody at that
 * stage: the cascade moves on by itself five hours later.
 */
export function tieStageRecipients(team: TieLeadership, stage: TieStage, audience: readonly string[]): string[] {
  if (stage === "CAPTAIN") return team.captainId ? [team.captainId] : [];
  if (stage === "DEPUTY") return team.deputyId ? [team.deputyId] : [];
  return uniqueIds([...audience]);
}

/**
 * A choice has won but it needs a rival team before it can be applied. The
 * captain picks; the deputy is told too, so the chapter is not stuck for hours
 * on a single person being away.
 */
export function awaitingTargetRecipients(team: TieLeadership): string[] {
  return uniqueIds([team.captainId, team.deputyId].filter((id): id is string => !!id));
}

/**
 * Teams hit by the effects of a chapter, other than the one that played it. A
 * self-targeted effect puts the team in its own `affectedTeamIds` on some
 * paths; « ton équipe est touchée » makes no sense for the team that chose it.
 */
export function affectedTeams(summary: { teamId: string; affectedTeamIds: readonly string[] }): string[] {
  return uniqueIds([...summary.affectedTeamIds]).filter((id) => id !== summary.teamId);
}

/**
 * Drops whoever has already been told about this vote. An allied team is part
 * of the voting team's audience *and* can be caught by an effect: both payloads
 * carry the same `tag`, so the second one would silently replace the first in
 * the notification shade — better to send only the one that was meant for them.
 */
export function affectedRecipients(ids: readonly string[], alreadyNotified: readonly string[]): string[] {
  const seen = new Set(alreadyNotified);
  return uniqueIds([...ids]).filter((id) => !seen.has(id));
}
