import "server-only";
import { prisma } from "@/lib/db";
import type { ChallengeRole } from "@/lib/generated/prisma/enums";
import { pickChallengeForGuild, pickCurrentMembership } from "@/lib/tenancy/select";

/**
 * Tenancy: who belongs to which challenge, with which role.
 *
 * Every challenge is its own tenant — its organisers, its teams, its Discord
 * server. A person may organise one edition and play in another, so a role
 * only ever exists inside a challenge (`ChallengeMember`). The single exception
 * is `User.isSuperAdmin`, the platform owner, organiser of every edition.
 */

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type Db = typeof prisma | Tx;

const membershipInclude = { challenge: true } as const;

/** Every challenge the person belongs to, newest edition first. */
export function listMemberships(userId: string) {
  return prisma.challengeMember.findMany({
    where: { userId },
    include: membershipInclude,
    orderBy: { challenge: { startAt: "desc" } },
  });
}

export type Membership = Awaited<ReturnType<typeof listMemberships>>[number];

/** The person's role in that challenge, or null when they do not belong to it. */
export async function roleIn(userId: string, challengeId: string): Promise<ChallengeRole | null> {
  const [user, member] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } }),
    prisma.challengeMember.findUnique({ where: { challengeId_userId: { challengeId, userId } }, select: { role: true } }),
  ]);
  if (user?.isSuperAdmin) return "ORGANIZER";
  return member?.role ?? null;
}

/**
 * The challenge the person is currently working in: the one they asked for
 * (cookie) when they belong to it, otherwise their most relevant edition.
 */
export async function currentMembershipFor(userId: string, preferredId?: string | null): Promise<Membership | null> {
  return pickCurrentMembership(await listMemberships(userId), preferredId);
}

/** The person's team inside that challenge (at most one), or null. */
export function teamIn(userId: string, challengeId: string) {
  return prisma.teamMember
    .findUnique({ where: { userId_challengeId: { userId, challengeId } }, include: { team: true } })
    .then((m) => m?.team ?? null);
}

/** The challenge played on a Discord server: the ACTIVE edition, else the last one. */
export async function challengeForGuild(guildId: string) {
  const candidates = await prisma.challenge.findMany({ where: { discordGuildId: guildId } });
  return pickChallengeForGuild(candidates);
}

/**
 * Adds the person to a challenge, idempotently. An existing ORGANIZER is never
 * demoted by a later PLAYER invitation.
 */
export async function ensureMember(db: Db, challengeId: string, userId: string, role: ChallengeRole = "PLAYER") {
  return db.challengeMember.upsert({
    where: { challengeId_userId: { challengeId, userId } },
    create: { challengeId, userId, role },
    update: role === "ORGANIZER" ? { role } : {},
  });
}

export function setMemberRole(challengeId: string, userId: string, role: ChallengeRole) {
  return prisma.challengeMember.upsert({
    where: { challengeId_userId: { challengeId, userId } },
    create: { challengeId, userId, role },
    update: { role },
  });
}

/** The editions the person may administrate — all of them for a super-admin. */
export async function listOrganizedChallenges(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } });
  return prisma.challenge.findMany({
    where: user?.isSuperAdmin ? {} : { members: { some: { userId, role: "ORGANIZER" } } },
    orderBy: { startAt: "desc" },
  });
}

/**
 * Consumes every unused invitation of that Discord id: one membership (and one
 * team) per challenge that invited them. Idempotent — replayed on every login,
 * so an invitation created after the first connection takes effect on the next.
 * Returns the challenges joined.
 */
export async function consumePendingInvites(userId: string, discordId: string): Promise<string[]> {
  const invites = await prisma.invite.findMany({ where: { discordId, usedAt: null }, include: { team: true } });
  const joined: string[] = [];

  for (const invite of invites) {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-read inside the transaction: two parallel logins must consume it once.
        const fresh = await tx.invite.findUnique({ where: { id: invite.id } });
        if (!fresh || fresh.usedAt) return;
        await tx.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
        await ensureMember(tx, invite.challengeId, userId, invite.role);
        // An invitation may only seat someone in a team of its own challenge.
        if (invite.team && invite.team.challengeId === invite.challengeId) {
          await tx.teamMember.upsert({
            where: { userId_challengeId: { userId, challengeId: invite.challengeId } },
            create: { userId, challengeId: invite.challengeId, teamId: invite.teamId! },
            update: { teamId: invite.teamId! },
          });
        }
        joined.push(invite.challengeId);
      });
    } catch (e) {
      console.error("[tenancy] invite non consommée", invite.id, e);
    }
  }
  return joined;
}

/** Organisers of the challenge who linked a Discord account (role pings, setup). */
export async function organizersWithDiscord(challengeId: string) {
  const members = await prisma.challengeMember.findMany({
    where: { challengeId, role: "ORGANIZER", user: { discordId: { not: null } } },
    include: { user: { select: { id: true, name: true, discordId: true } } },
  });
  return members.map((m) => m.user);
}

export type DiscordActor = {
  user: { id: string; name: string | null; discordId: string | null };
  challenge: NonNullable<Awaited<ReturnType<typeof challengeForGuild>>>;
  role: ChallengeRole;
  team: Awaited<ReturnType<typeof teamIn>>;
};

export type ResolvedDiscordActor =
  | { kind: "ok"; actor: DiscordActor }
  | { kind: "unknown-user" }
  | { kind: "no-challenge" }
  | { kind: "not-member" };

/**
 * Who is talking to the bot, and in which challenge. The Discord server decides
 * the tenant; in a DM (no guild) we fall back on the person's current edition.
 */
export async function resolveDiscordActor(discordId: string, guildId: string | null): Promise<ResolvedDiscordActor> {
  const user = await prisma.user.findUnique({ where: { discordId }, select: { id: true, name: true, discordId: true } });
  if (!user) return { kind: "unknown-user" };

  const challenge = guildId ? await challengeForGuild(guildId) : ((await currentMembershipFor(user.id))?.challenge ?? null);
  if (!challenge) return { kind: "no-challenge" };

  const role = await roleIn(user.id, challenge.id);
  if (!role) return { kind: "not-member" };

  return { kind: "ok", actor: { user, challenge, role, team: await teamIn(user.id, challenge.id) } };
}
