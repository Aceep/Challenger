import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readingPoints } from "@/lib/scoring/reading";
import { awardPoints } from "@/lib/services/points";

export const bookSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(200),
  author: z.string().trim().min(1, "Auteur·ice requis·e").max(120),
  pages: z.coerce.number().int("Nombre entier").min(1, "Au moins 1 page").max(5000),
  finishedAt: z.coerce.date().optional(),
});
export type BookInput = z.infer<typeof bookSchema>;

/** Logs a finished book and credits the player's team. */
export async function logBook(userId: string, input: BookInput) {
  const membership = await prisma.teamMember.findUnique({
    where: { userId },
    include: { team: { include: { challenge: true } } },
  });

  return prisma.$transaction(async (tx) => {
    const book = await tx.book.create({
      data: {
        userId,
        title: input.title,
        author: input.author,
        pages: input.pages,
        finishedAt: input.finishedAt ?? new Date(),
      },
    });
    let event = null;
    if (membership) {
      const base = readingPoints(input.pages, membership.team.challenge.pointsPerPage);
      event = await awardPoints(tx, {
        teamId: membership.teamId,
        userId,
        source: "READING",
        baseAmount: base,
        label: `Lecture : ${input.title}`,
        bookId: book.id,
      });
    }
    return { book, points: event?.amount ?? 0 };
  });
}

/** Deletes a book and reverses every point it earned (as a negative event). */
export async function deleteBook(userId: string, bookId: string) {
  return prisma.$transaction(async (tx) => {
    const book = await tx.book.findFirst({
      where: { id: bookId, userId },
      include: { pointEvents: true },
    });
    if (!book) throw new Error("Livre introuvable");

    for (const ev of book.pointEvents) {
      if (ev.source !== "READING" || ev.amount === 0) continue;
      await awardPoints(tx, {
        teamId: ev.teamId,
        userId,
        source: "READING",
        baseAmount: -ev.baseAmount,
        rawAmount: -ev.amount,
        label: `Annulation : ${book.title}`,
        refId: ev.id,
      });
    }
    await tx.book.delete({ where: { id: bookId } });
  });
}

export function listBooks(userId: string) {
  return prisma.book.findMany({
    where: { userId },
    orderBy: { finishedAt: "desc" },
    include: { pointEvents: { select: { amount: true } } },
  });
}
