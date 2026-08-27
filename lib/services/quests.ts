import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bookWeight, isComplete, MAX_BOOKS_PER_SLOT } from "@/lib/scoring/reading";
import { awardPoints } from "@/lib/services/points";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export const questSchema = z
  .object({
    title: z.string().trim().min(1, "Titre requis").max(120),
    description: z.string().trim().max(2000).default(""),
    type: z.enum(["TEAM", "INDIVIDUAL"]),
    kind: z.enum(["ACTION", "LECTURE"]).default("ACTION"),
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
      completions: { where: { OR: [{ userId }, ...(teamId ? [{ teamId }] : [])] } },
      books: {
        where: { OR: [{ userId }, ...(teamId ? [{ teamId }] : [])] },
        include: { book: { select: { id: true, title: true, isGraphic: true, userId: true, user: { select: { name: true } } } } },
      },
      _count: { select: { completions: true } },
    },
  });
  return quests.map((q) => {
    const mine = q.books.filter((b) => (q.type === "INDIVIDUAL" ? b.userId === userId : b.teamId === teamId));
    const weight = mine.reduce((n, b) => n + bookWeight(b.book.isGraphic), 0);
    return {
      ...q,
      open: isQuestOpen(q),
      done: q.type === "INDIVIDUAL" ? q.completions.some((c) => c.userId === userId) : q.completions.some((c) => c.teamId === teamId),
      linkedBooks: mine.map((b) => ({ id: b.book.id, title: b.book.title, isGraphic: b.book.isGraphic, owner: b.book.user.name ?? "?" })),
      progress: Math.min(weight, 1),
    };
  });
}

export function listQuestsAdmin(challengeId: string) {
  return prisma.quest.findMany({
    where: { challengeId },
    orderBy: { createdAt: "desc" },
    include: { targetTeam: { select: { name: true } }, _count: { select: { completions: true } } },
  });
}

type Actor = { id: string; role: "ADMIN" | "PLAYER"; teamId: string | null; isCaptain: boolean };

function completionRef(quest: { id: string; type: "TEAM" | "INDIVIDUAL" }, owner: { userId?: string; teamId?: string }) {
  return `quest:${quest.id}:${quest.type === "INDIVIDUAL" ? `user:${owner.userId}` : `team:${owner.teamId}`}`;
}

/** Records a completion and credits the team. Idempotent per owner. */
async function grantCompletion(tx: Tx, quest: { id: string; type: "TEAM" | "INDIVIDUAL"; title: string; points: number }, owner: { userId?: string; teamId?: string }, teamId: string, actorId: string) {
  const existing = await tx.questCompletion.findFirst({ where: { questId: quest.id, ...owner } });
  if (existing) return { points: 0, already: true };
  await tx.questCompletion.create({ data: { questId: quest.id, ...owner, completedById: actorId } });
  const event = await awardPoints(tx, { teamId, userId: actorId, source: "QUEST", baseAmount: quest.points, label: `Quête : ${quest.title}`, refId: completionRef(quest, owner) });
  return { points: event?.amount ?? 0, already: false };
}

/** Removes a completion and reverses its points (no-op when absent). */
async function revokeCompletion(tx: Tx, quest: { id: string; type: "TEAM" | "INDIVIDUAL"; title: string }, owner: { userId?: string; teamId?: string }, actorId: string) {
  const existing = await tx.questCompletion.findFirst({ where: { questId: quest.id, ...owner } });
  if (!existing) return;
  await tx.questCompletion.delete({ where: { id: existing.id } });
  const refId = completionRef(quest, owner);
  const original = await tx.pointEvent.findFirst({ where: { refId, amount: { gt: 0 } }, orderBy: { createdAt: "desc" } });
  if (original) {
    await awardPoints(tx, { teamId: original.teamId, userId: actorId, source: "QUEST", baseAmount: -original.baseAmount, rawAmount: -original.amount, label: `Annulation quête : ${quest.title}`, refId: `${refId}:undo` });
  }
}

/** ACTION quests: marks done for the actor (individual) or their team (team quest). */
export async function completeQuest(questId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const quest = await tx.quest.findUniqueOrThrow({ where: { id: questId }, include: { challenge: true } });
    if (quest.challenge.endAt < new Date()) throw new Error("Le défi est terminé");
    if (quest.kind === "LECTURE") throw new Error("Cette quête se valide en y rattachant un livre");
    if (!isQuestOpen(quest)) throw new Error("Cette quête n'est pas ouverte");
    if (!actor.teamId) throw new Error("Tu n'as pas d'équipe");
    if (quest.targetTeamId && quest.targetTeamId !== actor.teamId) throw new Error("Cette quête ne concerne pas ton équipe");
    if (quest.type === "TEAM" && !actor.isCaptain && actor.role !== "ADMIN") throw new Error("Seul·e le·la capitaine peut valider une quête d'équipe");
    const owner = quest.type === "INDIVIDUAL" ? { userId: actor.id } : { teamId: actor.teamId };
    return grantCompletion(tx, quest, owner, actor.teamId, actor.id);
  });
}

/** ACTION quests: reverts a completion (own individual one, or team one for captain/admin). */
export async function uncompleteQuest(questId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const quest = await tx.quest.findUniqueOrThrow({ where: { id: questId } });
    if (quest.kind === "LECTURE") throw new Error("Retire plutôt le livre rattaché à cette quête");
    if (!actor.teamId) throw new Error("Tu n'as pas d'équipe");
    if (quest.type === "TEAM" && !actor.isCaptain && actor.role !== "ADMIN") throw new Error("Seul·e le·la capitaine peut annuler une quête d'équipe");
    const owner = quest.type === "INDIVIDUAL" ? { userId: actor.id } : { teamId: actor.teamId };
    await revokeCompletion(tx, quest, owner, actor.id);
  });
}

// ---------------------------------------------------------------------------
// LECTURE quests: completion derived from attached books
// ---------------------------------------------------------------------------

type BookRef = { id: string; isGraphic: boolean; userId: string };

async function syncLectureCompletion(tx: Tx, questId: string, userId: string, teamId: string, actorId: string) {
  const quest = await tx.quest.findUniqueOrThrow({ where: { id: questId } });
  const owner = quest.type === "INDIVIDUAL" ? { userId } : { teamId };
  const books = await tx.questBook.findMany({ where: { questId, ...owner }, include: { book: { select: { isGraphic: true } } } });
  const complete = isComplete(books.map((b) => bookWeight(b.book.isGraphic)));
  if (complete) return grantCompletion(tx, quest, owner, teamId, actorId);
  await revokeCompletion(tx, quest, owner, actorId);
  return { points: 0, already: false, complete: false };
}

/** Attaches a book to a LECTURE quest (moves it if attached elsewhere) and updates completion. */
export async function attachBookToQuest(tx: Tx, book: BookRef, teamId: string, questId: string, actorId: string) {
  const quest = await tx.quest.findUniqueOrThrow({ where: { id: questId }, include: { challenge: true } });
  if (quest.kind !== "LECTURE") throw new Error("Cette quête ne se valide pas avec un livre");
  if (!isQuestOpen(quest)) throw new Error("Cette quête n'est pas ouverte");
  if (quest.targetTeamId && quest.targetTeamId !== teamId) throw new Error("Cette quête ne concerne pas ton équipe");
  const owner = quest.type === "INDIVIDUAL" ? { userId: book.userId } : { teamId };
  const others = await tx.questBook.findMany({ where: { questId, ...owner, bookId: { not: book.id } }, include: { book: { select: { isGraphic: true } } } });
  if (isComplete(others.map((b) => bookWeight(b.book.isGraphic)))) throw new Error(`La quête « ${quest.title} » est déjà validée`);
  if (others.length >= MAX_BOOKS_PER_SLOT) throw new Error(`La quête « ${quest.title} » a déjà ${MAX_BOOKS_PER_SLOT} livres`);

  const previous = await tx.questBook.findUnique({ where: { bookId: book.id } });
  await tx.questBook.upsert({ where: { bookId: book.id }, create: { bookId: book.id, questId, userId: book.userId, teamId }, update: { questId, userId: book.userId, teamId } });
  if (previous && previous.questId !== questId) await syncLectureCompletion(tx, previous.questId, previous.userId, previous.teamId, actorId);
  const r = await syncLectureCompletion(tx, questId, book.userId, teamId, actorId);
  return { title: quest.title, complete: "complete" in r ? false : true, points: r.points };
}

/** Detaches a book from its quest (no-op when none) and updates completion. */
export async function detachBookFromQuest(tx: Tx, bookId: string, actorId: string) {
  const link = await tx.questBook.findUnique({ where: { bookId } });
  if (!link) return null;
  await tx.questBook.delete({ where: { bookId } });
  await syncLectureCompletion(tx, link.questId, link.userId, link.teamId, actorId);
  return link.questId;
}

/** Re-evaluates a quest after a book's weight changed while attached. */
export async function resyncBookQuest(tx: Tx, bookId: string, actorId: string) {
  const link = await tx.questBook.findUnique({ where: { bookId } });
  if (link) await syncLectureCompletion(tx, link.questId, link.userId, link.teamId, actorId);
}
