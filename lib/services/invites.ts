import "server-only";
import { prisma } from "@/lib/db";
import { APP_URL } from "@/lib/app-url";
import { inviteDmMessage } from "@/lib/discord/invite-dm";
import { createDmChannel, getGuild, postMessage } from "@/lib/discord/rest";
import { createInvite, inviteSchema } from "@/lib/services/admin";
import { syncMemberRoles } from "@/lib/services/discord-setup";
import { consumePendingInvites } from "@/lib/services/membership";
import type { ChallengeRole } from "@/lib/generated/prisma/enums";

/**
 * Inviting, from wherever one invites.
 *
 * The web form (Admin › Joueurs) and `/inviter` on Discord do exactly the same
 * thing, so they call the same function: one invitation per Discord id, an
 * immediate join for the people who already have an account, and a private
 * message to everyone — an invitation nobody is told about is an invitation
 * nobody uses.
 */

export type InviteMembersInput = {
  discordIds: string[];
  teamId?: string | null;
  role?: ChallengeRole;
};

export type InviteMembersResult = {
  /** Discord ids actually invited, in the order they were given. */
  invited: string[];
  /** People who already had an account: they are in the challenge right now. */
  joinedNow: { userId: string; challengeId: string }[];
  /** The invitations, to notify in an `after()`. */
  inviteIds: string[];
  /** The team the invitations seat people in, for the confirmation message. */
  team: { id: string; name: string } | null;
};

/**
 * Creates (or refreshes) the invitations of one edition.
 *
 * Someone who already signed in once does not have to log out and back in: the
 * invitation is consumed on the spot, and they find the edition on their next
 * page. For everyone else it waits — `consumePendingInvites` replays it at the
 * first login.
 */
export async function inviteMembers(challengeId: string, input: InviteMembersInput): Promise<InviteMembersResult> {
  const teamId = input.teamId || null;
  const role = input.role ?? "PLAYER";
  const result: InviteMembersResult = { invited: [], joinedNow: [], inviteIds: [], team: null };

  for (const discordId of [...new Set(input.discordIds)]) {
    // Same validation as the web form: a Discord id is a snowflake, nothing else.
    const parsed = inviteSchema.safeParse({ discordId, teamId: teamId ?? undefined, role });
    if (!parsed.success) continue;
    const invite = await createInvite(challengeId, parsed.data);
    result.invited.push(discordId);
    result.inviteIds.push(invite.id);

    const user = await prisma.user.findUnique({ where: { discordId }, select: { id: true } });
    if (!user) continue;
    for (const joinedId of await consumePendingInvites(user.id, discordId)) {
      result.joinedNow.push({ userId: user.id, challengeId: joinedId });
    }
  }

  if (teamId) {
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } });
    result.team = team ?? null;
  }
  return result;
}

/**
 * Kyle writes to the invited person, once. Best-effort by construction: a great
 * many people refuse DMs from server members (403, code 50007), and that must
 * never fail the invitation itself — `notifiedAt` simply stays null, which
 * Admin › Joueurs shows as « MP non délivré ».
 */
export async function notifyInvite(inviteId: string): Promise<boolean> {
  try {
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
      include: { challenge: { select: { name: true, discordGuildId: true } }, team: { select: { name: true } } },
    });
    if (!invite || invite.notifiedAt) return false;

    const dm = await createDmChannel(invite.discordId);
    if (!dm.ok) return false;

    // The server's name is a nicety: without it the message still says everything.
    const guild = invite.challenge.discordGuildId ? await getGuild(invite.challenge.discordGuildId) : null;
    const message = inviteDmMessage({
      challengeName: invite.challenge.name,
      teamName: invite.team?.name ?? null,
      guildName: guild?.ok ? guild.data.name : null,
      appUrl: APP_URL(),
    });

    const posted = await postMessage(dm.data.id, message);
    if (!posted) return false;
    await prisma.invite.update({ where: { id: inviteId }, data: { notifiedAt: new Date() } });
    return true;
  } catch (e) {
    console.error("[invites] MP non envoyé", inviteId, e);
    return false;
  }
}

/** Sends every invitation DM of a batch, and aligns the roles of those who joined at once. */
export async function notifyAndSync(result: Pick<InviteMembersResult, "inviteIds" | "joinedNow">): Promise<void> {
  for (const id of result.inviteIds) await notifyInvite(id);
  for (const { userId, challengeId } of result.joinedNow) await syncMemberRoles(userId, challengeId);
}

/**
 * Throttle of `joinPendingOnActivity`, per instance and per person: one check
 * every five minutes, same idea as `lastActivityTick` in `tick.ts`. Someone who
 * browses the app must not query the invitations on every page.
 */
const lastJoinCheck = new Map<string, number>();
const JOIN_THROTTLE_MS = 5 * 60_000;

/**
 * Consumes the invitations that arrived while the person was already signed in.
 *
 * `auth.ts` only replays them at login, so an invitation created afterwards
 * used to need a sign-out. Called from the player layout through `after()`:
 * cheap, idempotent, and never fatal — the page owes nothing to Discord.
 */
export async function joinPendingOnActivity(userId: string, discordId: string | null | undefined): Promise<void> {
  if (!discordId) return;
  const now = Date.now();
  if (now - (lastJoinCheck.get(userId) ?? 0) < JOIN_THROTTLE_MS) return;
  lastJoinCheck.set(userId, now);
  try {
    for (const challengeId of await consumePendingInvites(userId, discordId)) {
      await syncMemberRoles(userId, challengeId);
    }
  } catch (e) {
    console.error("[invites] adhésion à l'activité", userId, e);
  }
}
