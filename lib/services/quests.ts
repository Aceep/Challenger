import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { awardPoints } from "@/lib/services/points";

export const questSchema = z
  .object({
    title: z.string().trim().min(1, "Titre requis").max(120),
    description: z.string().trim().max(2000).default(""),
    type: z.enum(["TEAM", "INDIVIDUAL"]),
    points: z.coerce.number().int().min(0).max(10000),
    openAt: z
      .string()
      .optional()
      .transform((s) => (s ? new Date(s) : null)),
    closeAt: z
      .string()
      .optional()
      .transform((s) => (s ? new Date(s) : null)),
    targetTeamId: z.string().optional().transform((s) => s || null),
  })
  .refine((q) => !q.openAt || !q.closeAt || q.closeAt > q.openAt, { message: "La fin doit être après le début", path: ["closeAt"] });
export type QuestInput = z.infer<typeof questSchema>;

export function createQuest(challengeId: string, input: QuestInput) {
  return prisma.quest.create({ data: { challengeId, ...input } });
}

export function updateQuest(id: string, input: QuestInput) {
  return prisma.quest.update({ where: { id }, data: input });
}

export function deleteQuest(id: string) {
  return prisma.quest.delete({ where: { id } });
}

export function isQuestOpen(q: { openAt: Date | null; closeAt: Date | null }, at = new Date()) {
  return (!q.openAt || q.openAt <= at) && (!q.closeAt || at <= q.closeAt);
}

/** Quests visible to a player: challenge-wide ones plus those targeted at their team. */
export async function listQuestsForPlayer(challengeId: string, userId: string, teamId: string | null) {
  const quests = await prisma.quest.findMany({
    where: { challengeId, OR: [{ targetTeamId: null }, ...(teamId ? [{ targetTeamId: teamId }] : [])] },
    orderBy: [{ closeAt: "asc" }, { createdAt: "desc" }],
    include: {
      completions: {
        where: { OR: [{ userId }, ...(teamId ? [{ teamId }] : [])] },
        include: { user: { select: { name: true } } },
      },
      _count: { select: { completions: true } },
    },
  });
  return quests.map((q) => ({
    ...q,
    open: isQuestOpen(q),
    done: q.type === "INDIVIDUAL" ? q.completions.some((c) => c.userId === userId) : q.completions.some((c) => c.teamId === teamId),
  }));
}

export function listQuestsAdmin(challengeId: string) {
  return prisma.quest.findMany({
    where: { challengeId },
    orderBy: { createdAt: "desc" },
    include: { targetTeam: { select: { name: true } }, _count: { select: { completions: true } } },
  });
}

type Actor = { id: string; role: "ADMIN" | "PLAYER"; teamId: string | null; isCaptain: boolean };

/** Marks a quest done for the actor (individual) or their team (team quest). */
export async function completeQuest(questId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const quest = await tx.quest.findUniqueOrThrow({ where: { id: questId } });
    if (!isQuestOpen(quest)) throw new Error("Cette quête n'est pas ouverte");
    if (!actor.teamId) throw new Error("Tu n'as pas d'équipe");
    if (quest.targetTeamId && quest.targetTeamId !== actor.teamId) throw new Error("Cette quête ne concerne pas ton équipe");

    const owner = quest.type === "INDIVIDUAL" ? { userId: actor.id } : { teamId: actor.teamId };
    if (quest.type === "TEAM" && !actor.isCaptain && actor.role !== "ADMIN") {
      throw new Error("Seul·e le·la capitaine peut valider une quête d'équipe");
    }
    const existing = await tx.questCompletion.findFirst({ where: { questId, ...owner } });
    if (existing) return { points: 0, already: true };

    await tx.questCompletion.create({ data: { questId, ...owner, completedById: actor.id } });
    const event = await awardPoints(tx, {
      teamId: actor.teamId,
      userId: actor.id,
      source: "QUEST",
      baseAmount: quest.points,
      label: `Quête : ${quest.title}`,
      refId: `quest:${questId}:${quest.type === "INDIVIDUAL" ? `user:${actor.id}` : `team:${actor.teamId}`}`,
    });
    return { points: event?.amount ?? 0, already: false };
  });
}

/** Reverts a completion (own individual one, or team one for captain/admin). */
export async function uncompleteQuest(questId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const quest = await tx.quest.findUniqueOrThrow({ where: { id: questId } });
    if (!actor.teamId) throw new Error("Tu n'as pas d'équipe");
    const owner = quest.type === "INDIVIDUAL" ? { userId: actor.id } : { teamId: actor.teamId };
    if (quest.type === "TEAM" && !actor.isCaptain && actor.role !== "ADMIN") {
      throw new Error("Seul·e le·la capitaine peut annuler une quête d'équipe");
    }
    const existing = await tx.questCompletion.findFirst({ where: { questId, ...owner } });
    if (!existing) return;
    await tx.questCompletion.delete({ where: { id: existing.id } });

    const refId = `quest:${questId}:${quest.type === "INDIVIDUAL" ? `user:${actor.id}` : `team:${actor.teamId}`}`;
    const original = await tx.pointEvent.findFirst({ where: { refId, amount: { gt: 0 } }, orderBy: { createdAt: "desc" } });
    if (original) {
      await awardPoints(tx, {
        teamId: original.teamId,
        userId: actor.id,
        source: "QUEST",
        baseAmount: -original.baseAmount,
        rawAmount: -original.amount,
        label: `Annulation quête : ${quest.title}`,
        refId: `${refId}:undo`,
      });
    }
  });
}
