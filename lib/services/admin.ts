import { GameError } from "@/lib/errors";
import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const challengeSchema = z
  .object({
    name: z.string().trim().min(1, "Nom requis").max(100),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    pointsPerPage: z.coerce.number().positive("Doit être > 0").max(10),
    bingoLineBonus: z.coerce.number().int().min(0),
    bingoFullBonus: z.coerce.number().int().min(0),
    status: z.enum(["DRAFT", "ACTIVE", "FINISHED"]),
    discordGuildId: z.string().trim().optional(),
    discordGeneralChannelId: z.string().trim().optional(),
  })
  .refine((c) => c.endAt > c.startAt, { message: "La fin doit être après le début", path: ["endAt"] });
export type ChallengeInput = z.infer<typeof challengeSchema>;

export async function upsertChallenge(id: string | null, input: ChallengeInput) {
  const data = {
    ...input,
    discordGuildId: input.discordGuildId || null,
    discordGeneralChannelId: input.discordGeneralChannelId || null,
  };
  return prisma.$transaction(async (tx) => {
    if (data.status === "ACTIVE") {
      // Only one active challenge at a time.
      await tx.challenge.updateMany({
        where: { status: "ACTIVE", ...(id ? { id: { not: id } } : {}) },
        data: { status: "FINISHED" },
      });
    }
    return id
      ? tx.challenge.update({ where: { id }, data })
      : tx.challenge.create({ data });
  });
}

export const teamSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex attendue"),
  discordChannelId: z.string().trim().optional(),
  discordLibraryChannelId: z.string().trim().optional(),
});

export function createTeam(challengeId: string, input: z.infer<typeof teamSchema>) {
  return prisma.team.create({
    data: { challengeId, name: input.name, color: input.color, discordChannelId: input.discordChannelId || null, discordLibraryChannelId: input.discordLibraryChannelId || null },
  });
}

export function updateTeam(id: string, input: z.infer<typeof teamSchema>) {
  return prisma.team.update({
    where: { id },
    data: { name: input.name, color: input.color, discordChannelId: input.discordChannelId || null, discordLibraryChannelId: input.discordLibraryChannelId || null },
  });
}

export function deleteTeam(id: string) {
  return prisma.team.delete({ where: { id } });
}

export const inviteSchema = z.object({
  discordId: z.string().trim().regex(/^\d{15,22}$/, "Identifiant Discord (nombre) attendu"),
  teamId: z.string().optional(),
  role: z.enum(["ADMIN", "PLAYER"]).default("PLAYER"),
});

export function createInvite(challengeId: string, input: z.infer<typeof inviteSchema>) {
  return prisma.invite.upsert({
    where: { challengeId_discordId: { challengeId, discordId: input.discordId } },
    create: { challengeId, discordId: input.discordId, teamId: input.teamId || null, role: input.role },
    update: { teamId: input.teamId || null, role: input.role },
  });
}

export function deleteInvite(id: string) {
  return prisma.invite.delete({ where: { id } });
}

/** Moves a user to a team (or removes them when teamId is empty). */
export async function assignUserToTeam(userId: string, teamId: string | null) {
  if (!teamId) {
    await prisma.teamMember.deleteMany({ where: { userId } });
    await prisma.team.updateMany({ where: { captainId: userId }, data: { captainId: null } });
    return;
  }
  await prisma.$transaction([
    prisma.team.updateMany({ where: { captainId: userId, id: { not: teamId } }, data: { captainId: null } }),
    prisma.teamMember.upsert({
      where: { userId },
      create: { userId, teamId },
      update: { teamId },
    }),
  ]);
}

export async function setCaptain(teamId: string, userId: string | null) {
  if (userId) {
    const member = await prisma.teamMember.findUnique({ where: { userId } });
    if (member?.teamId !== teamId) throw new GameError("Ce joueur n'est pas dans l'équipe");
  }
  return prisma.team.update({ where: { id: teamId }, data: { captainId: userId } });
}

export function setUserRole(userId: string, role: "ADMIN" | "PLAYER") {
  return prisma.user.update({ where: { id: userId }, data: { role } });
}

export function listUsersWithTeams() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { membership: { include: { team: true } }, _count: { select: { books: true } } },
  });
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
