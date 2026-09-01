import "server-only";
import { prisma } from "@/lib/db";
import { cellLabel } from "@/lib/services/bingo";
import { num } from "@/lib/services/points";

/**
 * Admin supervision of the readings declared by the players (see REDESIGN §9.1).
 * Read-only helpers: every correction goes through `updateBook` / `deleteBook`
 * (lib/services/books.ts) with an ADMIN actor, so the rules stay in one place.
 */

export const READINGS_PAGE_SIZE = 50;

export type ReadingsFilter = {
  teamId?: string | null;
  userId?: string | null;
  /** Free text matched on title and author. */
  q?: string | null;
  /** Include soft-deleted readings. */
  deleted?: boolean;
  /** 1-based. */
  page?: number;
};

const READING_INCLUDE = {
  user: { select: { id: true, name: true } },
  team: { select: { id: true, name: true, color: true } },
  updatedBy: { select: { id: true, name: true } },
  questBook: { select: { questId: true, quest: { select: { number: true, title: true } } } },
  bingoFill: { select: { cellId: true, cell: { select: { row: true, col: true, prompt: true } } } },
} as const;

function buildWhere(challengeId: string, f: ReadingsFilter) {
  const q = f.q?.trim();
  return {
    team: { challengeId },
    ...(f.teamId ? { teamId: f.teamId } : {}),
    ...(f.userId ? { userId: f.userId } : {}),
    ...(f.deleted ? {} : { deletedAt: null }),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { author: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
}

function decorate<T extends { points: { toString(): string }; deletedAt: Date | null; bingoFill: { cell: { row: number; col: number } } | null }>(b: T) {
  return {
    ...b,
    points: num(b.points),
    deleted: b.deletedAt !== null,
    cellLabel: b.bingoFill ? cellLabel(b.bingoFill.cell.row, b.bingoFill.cell.col) : null,
  };
}

/** Every reading of the challenge, most recent first, paginated and filtered. */
export async function listReadingsAdmin(challengeId: string, filter: ReadingsFilter = {}) {
  const where = buildWhere(challengeId, filter);
  const page = Math.max(1, filter.page ?? 1);
  const [total, books] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * READINGS_PAGE_SIZE,
      take: READINGS_PAGE_SIZE,
      include: READING_INCLUDE,
    }),
  ]);
  return { books: books.map(decorate), total, page, pages: Math.max(1, Math.ceil(total / READINGS_PAGE_SIZE)) };
}

/** One reading of the challenge, with everything the admin edit modal needs (deleted ones included). */
export async function getReadingAdmin(challengeId: string, bookId: string) {
  // Scoped like the listing: a reading of another edition is « introuvable » here.
  const book = await prisma.book.findFirst({ where: { id: bookId, team: { challengeId } }, include: READING_INCLUDE });
  return book && decorate(book);
}
