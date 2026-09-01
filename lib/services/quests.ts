import { GameError } from "@/lib/errors";
import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bookWeight, isComplete, MAX_BOOKS_PER_SLOT, type BookType } from "@/lib/scoring/reading";
import { assertTeamOf } from "@/lib/services/admin";
import { awardPoints, reverseByRef } from "@/lib/services/points";

/**
 * Quests are team-level reading prompts: a team validates quest #n by attaching
 * readings whose weights (roman 1, graphique ½) reach 1. Completion is derived
 * from the attached readings; QuestCompletion records it for the ledger.
 */

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export const questSchema = z
  .object({
    number: z.coerce.number().int().min(1).optional(),
    title: z.string().trim().min(1, "Titre requis").max(120),
    description: z.string().trim().max(2000).default(""),
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

async function nextNumber(tx: Tx, challengeId: string) {
  const last = await tx.quest.aggregate({ where: { challengeId }, _max: { number: true } });
  return (last._max.number ?? 0) + 1;
}

/** Refuses to touch a quest of another edition. */
export async function assertQuestOf(challengeId: string, questId: string) {
  const quest = await prisma.quest.findUnique({ where: { id: questId }, select: { challengeId: true } });
  if (!quest || quest.challengeId !== challengeId) throw new GameError("Cette quête n'appartient pas à ce défi");
}

export async function createQuest(challengeId: string, input: QuestInput) {
  if (input.targetTeamId) await assertTeamOf(challengeId, input.targetTeamId);
  return prisma.$transaction(async (tx) => {
    const number = input.number ?? (await nextNumber(tx, challengeId));
    return tx.quest.create({ data: { challengeId, ...input, number } });
  });
}

/** The number is assigned once at creation and never edited. */
export async function updateQuest(challengeId: string, id: string, input: QuestInput) {
  await assertQuestOf(challengeId, id);
  if (input.targetTeamId) await assertTeamOf(challengeId, input.targetTeamId);
  const { number: _ignored, ...data } = input;
  void _ignored;
  return prisma.quest.update({ where: { id }, data });
}

export async function deleteQuest(challengeId: string, id: string) {
  await assertQuestOf(challengeId, id);
  return prisma.quest.delete({ where: { id } });
}

export function isQuestOpen(q: { openAt: Date | null; closeAt: Date | null }, at = new Date()) {
  return (!q.openAt || q.openAt <= at) && (!q.closeAt || at <= q.closeAt);
}

export const questLabel = (q: { number: number; title: string }) => `#${q.number} — ${q.title}`;

/** Quests visible to a team with its progress: challenge-wide ones plus those targeted at it. */
export async function listQuestsForTeam(challengeId: string, teamId: string | null) {
  const quests = await prisma.quest.findMany({
    where: { challengeId, OR: [{ targetTeamId: null }, ...(teamId ? [{ targetTeamId: teamId }] : [])] },
    orderBy: { number: "asc" },
    include: {
      completions: { where: { teamId: teamId ?? "" } },
      books: {
        where: { teamId: teamId ?? "", book: { deletedAt: null } },
        orderBy: { createdAt: "asc" },
        include: { book: { select: { id: true, title: true, type: true, userId: true, user: { select: { name: true } } } } },
      },
    },
  });
  return quests.map((q) => {
    const books = q.books;
    const weight = books.reduce((n, b) => n + bookWeight(b.book.type), 0);
    return {
      id: q.id,
      number: q.number,
      title: q.title,
      description: q.description,
      points: q.points,
      openAt: q.openAt,
      closeAt: q.closeAt,
      targetTeamId: q.targetTeamId,
      origin: q.origin,
      open: isQuestOpen(q),
      done: q.completions.length > 0,
      linkedBooks: books.map((b) => ({ id: b.book.id, title: b.book.title, type: b.book.type, owner: b.book.user.name ?? "?" })),
      progress: Math.min(weight, 1),
    };
  });
}

export function listQuestsAdmin(challengeId: string) {
  return prisma.quest.findMany({
    where: { challengeId },
    orderBy: { number: "asc" },
    include: { targetTeam: { select: { name: true } }, _count: { select: { completions: true } } },
  });
}

// ---------------------------------------------------------------------------
// Completion derived from attached readings (called inside the book transaction)
// ---------------------------------------------------------------------------

const completionRef = (questId: string, teamId: string) => `quest:${questId}:team:${teamId}`;

async function syncCompletion(tx: Tx, quest: { id: string; number: number; title: string; points: number }, teamId: string, actorId: string) {
  const books = await tx.questBook.findMany({ where: { questId: quest.id, teamId, book: { deletedAt: null } }, include: { book: { select: { type: true } } } });
  const complete = isComplete(books.map((b) => bookWeight(b.book.type)));
  const existing = await tx.questCompletion.findUnique({ where: { questId_teamId: { questId: quest.id, teamId } } });
  if (complete && !existing) {
    await tx.questCompletion.create({ data: { questId: quest.id, teamId, completedById: actorId } });
    const ev = await awardPoints(tx, { teamId, userId: actorId, source: "QUEST", baseAmount: quest.points, label: `Quête #${quest.number} : ${quest.title}`, refId: completionRef(quest.id, teamId) });
    return { complete: true, points: ev?.amount ?? 0 };
  }
  if (!complete && existing) {
    await tx.questCompletion.delete({ where: { id: existing.id } });
    await reverseByRef(tx, completionRef(quest.id, teamId), actorId, `Annulation quête : ${quest.title}`);
  }
  return { complete, points: 0 };
}

type BookRef = { id: string; type: BookType; userId: string };

export type QuestAttachResult = {
  number: number;
  title: string;
  complete: boolean;
  points: number;
  /** A pending half freed by a roman completing the quest alone. */
  freed: { title: string; owner: string } | null;
};

/** Attaches a reading to a quest for its team (moves it if attached elsewhere) and updates completion. */
export async function attachBookToQuest(tx: Tx, book: BookRef, teamId: string, questId: string, actorId: string): Promise<QuestAttachResult> {
  // The quest is looked up inside the team's own edition — `questId` comes from a
  // form, and a quest of another edition must stay unreachable (as for a cell).
  const team = await tx.team.findUniqueOrThrow({ where: { id: teamId }, select: { challengeId: true } });
  const quest = await tx.quest.findUnique({ where: { id: questId, challengeId: team.challengeId } });
  if (!quest) throw new GameError("Cette quête n'appartient pas à ce défi");
  if (!isQuestOpen(quest)) throw new GameError(`La quête #${quest.number} n'est pas ouverte`);
  if (quest.targetTeamId && quest.targetTeamId !== teamId) throw new GameError(`La quête #${quest.number} ne concerne pas ton équipe`);
  const others = await tx.questBook.findMany({
    where: { questId, teamId, bookId: { not: book.id }, book: { deletedAt: null } },
    include: { book: { select: { id: true, title: true, type: true, user: { select: { name: true } } } } },
  });
  if (isComplete(others.map((b) => bookWeight(b.book.type)))) throw new GameError(`La quête #${quest.number} est déjà validée`);
  if (others.length >= MAX_BOOKS_PER_SLOT) throw new GameError(`La quête #${quest.number} a déjà ${MAX_BOOKS_PER_SLOT} lectures`);

  // A roman completes the quest alone: the pending half goes back to "en attente" (unlinked).
  let freed: QuestAttachResult["freed"] = null;
  if (book.type === "ROMAN" && others.length) {
    const half = others[0];
    await tx.questBook.delete({ where: { bookId: half.bookId } });
    freed = { title: half.book.title, owner: half.book.user.name ?? "?" };
  }

  const previous = await tx.questBook.findUnique({ where: { bookId: book.id }, include: { quest: true } });
  await tx.questBook.upsert({ where: { bookId: book.id }, create: { bookId: book.id, questId, userId: book.userId, teamId }, update: { questId, userId: book.userId, teamId } });
  if (previous && previous.questId !== questId) await syncCompletion(tx, previous.quest, previous.teamId, actorId);
  const r = await syncCompletion(tx, quest, teamId, actorId);
  return { number: quest.number, title: quest.title, complete: r.complete, points: r.points, freed };
}

/** Detaches a reading from its quest (no-op when none) and updates completion. */
export async function detachBookFromQuest(tx: Tx, bookId: string, actorId: string) {
  const link = await tx.questBook.findUnique({ where: { bookId }, include: { quest: true } });
  if (!link) return null;
  await tx.questBook.delete({ where: { bookId } });
  await syncCompletion(tx, link.quest, link.teamId, actorId);
  return link.questId;
}

/** Re-evaluates a quest after a reading's type changed while attached. */
export async function resyncBookQuest(tx: Tx, bookId: string, actorId: string) {
  const link = await tx.questBook.findUnique({ where: { bookId }, include: { quest: true } });
  if (link) await syncCompletion(tx, link.quest, link.teamId, actorId);
}
