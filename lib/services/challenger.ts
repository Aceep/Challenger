import "server-only";
import { prisma } from "@/lib/db";
import { addMemberRole } from "@/lib/discord/rest";
import { setupGuild, type SetupSummary } from "@/lib/services/discord-setup";
import { ensureMember } from "@/lib/services/membership";
import type { ChallengeModalTeam } from "@/lib/tenancy/challenge-modal";
import { CHALLENGE_DEFAULTS, guildChallengeName } from "@/lib/tenancy/new-challenge";

/**
 * The writes behind `/challenger creer` — opening a server's challenge from
 * Discord alone. It may be asked by a Discord id nobody has ever seen: no `User`
 * row is ever forged here (the Auth.js adapter creates it at the first OAuth),
 * an `Invite` carries the intention until that first connection consumes it
 * (`consumePendingInvites`).
 *
 * Unlike the web form, which opens a DRAFT edition to be finished on the site,
 * this one opens an **ACTIVE** edition: the whole challenge — name, dates, teams
 * — was typed in the modal, and a draft would only be a state nobody asked for.
 *
 * Joining is not a write of this module: a player only ever comes in through an
 * organiser's `Invite` (Admin › Joueurs).
 */

type Challenge = Awaited<ReturnType<typeof prisma.challenge.create>>;

export type CreateFromGuild =
  /** `pendingLogin`: the creator has no account yet and is an ORGANIZER invite for now. */
  | { kind: "created"; challenge: Challenge; pendingLogin: boolean }
  | { kind: "exists"; challenge: Challenge };

export type CreateFromGuildInput = {
  guildId: string;
  guildName?: string | null;
  discordId: string;
  name?: string | null;
  startAt: Date;
  endAt: Date;
  teams: ChallengeModalTeam[];
};

/**
 * Creates the challenge of a Discord server, with its teams, in one transaction.
 *
 * A server hosts one live challenge at a time: an existing edition that is not
 * FINISHED wins, and the caller is told so. That check lives *inside* the
 * transaction — Discord happily delivers the same modal submission twice, and
 * two editions on one server would split the community in half.
 */
export async function createChallengeFromGuild({ guildId, guildName, discordId, name, startAt, endAt, teams }: CreateFromGuildInput): Promise<CreateFromGuild> {
  const user = await prisma.user.findUnique({ where: { discordId }, select: { id: true } });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.challenge.findFirst({ where: { discordGuildId: guildId, status: { not: "FINISHED" } }, orderBy: { createdAt: "desc" } });
    if (existing) return { kind: "exists", challenge: existing };

    const challenge = await tx.challenge.create({
      data: {
        name: (name ?? "").trim() || guildChallengeName(guildName),
        startAt,
        endAt,
        ...CHALLENGE_DEFAULTS,
        status: "ACTIVE",
        discordGuildId: guildId,
        createdById: user?.id ?? null,
      },
    });

    if (teams.length) {
      await tx.team.createMany({ data: teams.map((t) => ({ challengeId: challenge.id, name: t.name, color: t.color })) });
    }

    if (user) await ensureMember(tx, challenge.id, user.id, "ORGANIZER");
    // Unknown Discord id: the edition has no member yet, and an ORGANIZER
    // invitation waits for the first connection.
    else await tx.invite.create({ data: { challengeId: challenge.id, discordId, role: "ORGANIZER" } });

    return { kind: "created", challenge, pendingLogin: !user };
  });
}

/**
 * Everything that happens on Discord once the edition exists: the guild
 * bootstrap (category, #annonces-défi, #faq, a role and two salons per team,
 * the slash commands), then the organiser role for whoever typed the command.
 *
 * The bootstrap only hands the admin role to organisers who *have an account*;
 * the person who created the challenge from Discord may have none yet, so their
 * role is given here, by Discord id. Best effort, like the rest of the setup.
 */
export async function bootstrapGuildChallenge(challengeId: string, creatorDiscordId: string): Promise<SetupSummary> {
  const summary = await setupGuild(challengeId);

  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { discordGuildId: true, discordAdminRoleId: true } });
    if (challenge?.discordGuildId && challenge.discordAdminRoleId) {
      const r = await addMemberRole(challenge.discordGuildId, creatorDiscordId, challenge.discordAdminRoleId);
      if (r.ok) summary.rolesAssigned++;
    }
  } catch (e) {
    console.error("[discord] rôle de l'auteur·ice du défi", e);
  }

  return summary;
}
