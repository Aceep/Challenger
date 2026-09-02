import "server-only";
import { prisma } from "@/lib/db";
import { upsertChallenge } from "@/lib/services/admin";
import { challengeForGuild } from "@/lib/services/membership";
import { CHALLENGE_DEFAULTS, defaultDatesFor, guildChallengeName } from "@/lib/tenancy/new-challenge";

/**
 * The write behind `/challenger creer` — opening a server's challenge. It may be
 * asked by a Discord id nobody has ever seen: no `User` row is ever forged here
 * (the Auth.js adapter creates it at the first OAuth), an `Invite` carries the
 * intention until that first connection consumes it (`consumePendingInvites`).
 *
 * Joining is not a write of this module: a player only ever comes in through an
 * organiser's `Invite` (Admin › Joueurs).
 */

type Challenge = NonNullable<Awaited<ReturnType<typeof challengeForGuild>>>;

export type CreateFromGuild =
  /** `pendingLogin`: the creator has no account yet and is an ORGANIZER invite for now. */
  | { kind: "created"; challenge: Challenge; pendingLogin: boolean }
  | { kind: "exists"; challenge: Challenge };

/**
 * Creates the challenge of a Discord server. A server hosts one live challenge
 * at a time: an existing edition that is not FINISHED wins, and the caller is
 * told to join it instead.
 */
export async function createChallengeFromGuild({
  guildId,
  guildName,
  discordId,
  name,
}: {
  guildId: string;
  guildName?: string | null;
  discordId: string;
  name?: string | null;
}): Promise<CreateFromGuild> {
  const existing = await challengeForGuild(guildId);
  if (existing && existing.status !== "FINISHED") return { kind: "exists", challenge: existing };

  const input = {
    name: (name ?? "").trim() || guildChallengeName(guildName),
    ...defaultDatesFor(),
    ...CHALLENGE_DEFAULTS,
    status: "DRAFT" as const,
    discordGuildId: guildId,
  };

  const user = await prisma.user.findUnique({ where: { discordId }, select: { id: true } });
  if (user) return { kind: "created", challenge: await upsertChallenge(null, input, user.id), pendingLogin: false };

  // Unknown Discord id: the edition has no creator yet, and an ORGANIZER
  // invitation waits for the first connection.
  const challenge = await prisma.$transaction(async (tx) => {
    const created = await tx.challenge.create({ data: { ...input, createdById: null } });
    await tx.invite.create({ data: { challengeId: created.id, discordId, role: "ORGANIZER" } });
    return created;
  });
  return { kind: "created", challenge, pendingLogin: true };
}
