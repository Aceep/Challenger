import { GameError } from "@/lib/errors";
import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureMember } from "@/lib/services/membership";

/**
 * Organiser-side writes. Every function is scoped to one challenge: a team, an
 * invitation or a membership always belongs to the edition it is managed from.
 */

/** Every field of an edition. Split out so the self-service form can pick a subset. */
export const challengeFields = z.object({
  name: z.string().trim().min(1, "Nom requis").max(100),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  pointsPerPage: z.coerce.number().positive("Doit être > 0").max(10),
  bingoLineBonus: z.coerce.number().int().min(0),
  bingoFullBonus: z.coerce.number().int().min(0),
  status: z.enum(["DRAFT", "ACTIVE", "FINISHED"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex attendue").default("#2E4A7D"),
  discordGuildId: z.string().trim().optional(),
  discordGeneralChannelId: z.string().trim().optional(),
});

const afterStart = { message: "La fin doit être après le début", path: ["endAt"] };

export const challengeSchema = challengeFields.refine((c) => c.endAt > c.startAt, afterStart);
export type ChallengeInput = z.infer<typeof challengeSchema>;

/**
 * The creation form of `/new`: no status (always a draft), no Discord id — the
 * organiser wires the server afterwards, from Admin › Défi.
 */
export const createChallengeSchema = challengeFields
  .pick({ name: true, startAt: true, endAt: true, color: true, pointsPerPage: true, bingoLineBonus: true, bingoFullBonus: true })
  .refine((c) => c.endAt > c.startAt, afterStart);
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

/**
 * Creates or edits an edition. Several challenges live side by side; the only
 * exclusivity left is per Discord server, since the bot resolves a guild to the
 * challenge being played there. The creator becomes its first organiser.
 */
export async function upsertChallenge(id: string | null, input: ChallengeInput, actorUserId: string) {
  const data = {
    ...input,
    discordGuildId: input.discordGuildId || null,
    discordGeneralChannelId: input.discordGeneralChannelId || null,
  };
  return prisma.$transaction(async (tx) => {
    if (data.status === "ACTIVE" && data.discordGuildId) {
      const clash = await tx.challenge.findFirst({
        where: { status: "ACTIVE", discordGuildId: data.discordGuildId, ...(id ? { id: { not: id } } : {}) },
      });
      if (clash) throw new GameError("Un défi actif utilise déjà ce serveur Discord");
    }
    if (id) return tx.challenge.update({ where: { id }, data });
    const challenge = await tx.challenge.create({ data: { ...data, createdById: actorUserId } });
    await ensureMember(tx, challenge.id, actorUserId, "ORGANIZER");
    return challenge;
  });
}

export const teamSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex attendue"),
  discordChannelId: z.string().trim().optional(),
  discordLibraryChannelId: z.string().trim().optional(),
});

/** Refuses to touch a team of another edition. */
export async function assertTeamOf(challengeId: string, teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { challengeId: true } });
  if (!team || team.challengeId !== challengeId) throw new GameError("Cette équipe n'appartient pas à ce défi");
}

export function createTeam(challengeId: string, input: z.infer<typeof teamSchema>) {
  return prisma.team.create({
    data: { challengeId, name: input.name, color: input.color, discordChannelId: input.discordChannelId || null, discordLibraryChannelId: input.discordLibraryChannelId || null },
  });
}

export async function updateTeam(challengeId: string, id: string, input: z.infer<typeof teamSchema>) {
  await assertTeamOf(challengeId, id);
  return prisma.team.update({
    where: { id },
    data: { name: input.name, color: input.color, discordChannelId: input.discordChannelId || null, discordLibraryChannelId: input.discordLibraryChannelId || null },
  });
}

export async function deleteTeam(challengeId: string, id: string) {
  await assertTeamOf(challengeId, id);
  return prisma.team.delete({ where: { id } });
}

export const inviteSchema = z.object({
  discordId: z.string().trim().regex(/^\d{15,22}$/, "Identifiant Discord (nombre) attendu"),
  teamId: z.string().optional(),
  role: z.enum(["ORGANIZER", "PLAYER"]).default("PLAYER"),
});

export async function createInvite(challengeId: string, input: z.infer<typeof inviteSchema>) {
  if (input.teamId) await assertTeamOf(challengeId, input.teamId);
  return prisma.invite.upsert({
    where: { challengeId_discordId: { challengeId, discordId: input.discordId } },
    create: { challengeId, discordId: input.discordId, teamId: input.teamId || null, role: input.role },
    update: { teamId: input.teamId || null, role: input.role },
  });
}

export function deleteInvite(id: string) {
  return prisma.invite.delete({ where: { id } });
}

/** Moves someone to a team of this challenge (or out of any team, when teamId is empty). */
export async function assignUserToTeam(challengeId: string, userId: string, teamId: string | null) {
  if (teamId) await assertTeamOf(challengeId, teamId);
  await prisma.$transaction(async (tx) => {
    // Leaving a team of this edition drops the captain/deputy hats that came with it.
    const left = { challengeId, ...(teamId ? { id: { not: teamId } } : {}) };
    await tx.team.updateMany({ where: { ...left, captainId: userId }, data: { captainId: null } });
    await tx.team.updateMany({ where: { ...left, deputyId: userId }, data: { deputyId: null } });
    if (!teamId) {
      await tx.teamMember.deleteMany({ where: { userId, challengeId } });
      return;
    }
    await tx.teamMember.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      create: { userId, challengeId, teamId },
      update: { teamId },
    });
    await ensureMember(tx, challengeId, userId);
  });
}

export async function setCaptain(challengeId: string, teamId: string, userId: string | null) {
  await assertTeamOf(challengeId, teamId);
  if (userId) {
    const member = await prisma.teamMember.findFirst({ where: { userId, teamId } });
    if (!member) throw new GameError("Ce joueur n'est pas dans l'équipe");
  }
  return prisma.team.update({ where: { id: teamId }, data: { captainId: userId } });
}

/** Members of the challenge, with their team and their readings inside it. */
export async function listUsersWithTeams(challengeId: string) {
  const [members, teamMembers, books] = await Promise.all([
    prisma.challengeMember.findMany({
      where: { challengeId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, discordId: true } } },
    }),
    prisma.teamMember.findMany({ where: { challengeId }, include: { team: { select: { id: true, name: true } } } }),
    prisma.book.groupBy({ by: ["userId"], where: { deletedAt: null, team: { challengeId } }, _count: { _all: true } }),
  ]);
  const teamOf = new Map(teamMembers.map((m) => [m.userId, m.team]));
  const booksOf = new Map(books.map((b) => [b.userId, b._count._all]));
  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    discordId: m.user.discordId,
    role: m.role,
    team: teamOf.get(m.userId) ?? null,
    books: booksOf.get(m.userId) ?? 0,
  }));
}

export function listTeamsWithMembers(challengeId: string) {
  return prisma.team.findMany({
    where: { challengeId },
    orderBy: { name: "asc" },
    include: { members: { include: { user: true } }, captain: true },
  });
}

export function listInvites(challengeId: string) {
  return prisma.invite.findMany({
    where: { challengeId },
    orderBy: { createdAt: "desc" },
    include: { team: true },
  });
}
