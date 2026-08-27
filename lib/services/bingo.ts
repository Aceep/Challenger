import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bingoDelta, completedLines, type CellPos } from "@/lib/scoring/bingo";
import { bookWeight, isComplete, MAX_BOOKS_PER_SLOT } from "@/lib/scoring/reading";
import { awardPoints } from "@/lib/services/points";

/**
 * Team bingo: one grid per challenge, one board per team. A cell holds up to
 * two books and is complete once their weights (book 1, graphique ½) reach 1.
 */

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const gridSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(80),
  size: z.coerce.number().int().min(3).max(6),
  /** One prompt per line, row-major, size×size lines. */
  prompts: z.string().transform((s) => s.split("\n").map((l) => l.trim())),
});

export async function upsertGrid(challengeId: string, input: z.infer<typeof gridSchema>) {
  const expected = input.size * input.size;
  const prompts = input.prompts.filter((p) => p.length > 0);
  if (prompts.length !== expected) {
    throw new Error(`Il faut exactement ${expected} consignes (une par ligne), ${prompts.length} reçues.`);
  }
  return prisma.$transaction(async (tx) => {
    const grid = await tx.bingoGrid.upsert({
      where: { challengeId_scope: { challengeId, scope: "TEAM" } },
      create: { challengeId, scope: "TEAM", title: input.title, size: input.size },
      update: { title: input.title, size: input.size },
    });
    // Keep cell ids stable when only the prompt changes (fills reference cells).
    for (let i = 0; i < expected; i++) {
      const row = Math.floor(i / input.size);
      const col = i % input.size;
      await tx.bingoCell.upsert({
        where: { gridId_row_col: { gridId: grid.id, row, col } },
        create: { gridId: grid.id, row, col, prompt: prompts[i] },
        update: { prompt: prompts[i] },
      });
    }
    await tx.bingoCell.deleteMany({ where: { gridId: grid.id, OR: [{ row: { gte: input.size } }, { col: { gte: input.size } }] } });
    return grid;
  });
}

export function deleteGrid(challengeId: string) {
  return prisma.bingoGrid.delete({ where: { challengeId_scope: { challengeId, scope: "TEAM" } } });
}

export function getGridAdmin(challengeId: string) {
  return prisma.bingoGrid.findUnique({
    where: { challengeId_scope: { challengeId, scope: "TEAM" } },
    include: { cells: { orderBy: [{ row: "asc" }, { col: "asc" }] } },
  });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** "B3" style label: column letter + row number, row-major. */
export function cellLabel(row: number, col: number) {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

export async function getTeamBoard(challengeId: string, teamId: string) {
  const grid = await prisma.bingoGrid.findUnique({
    where: { challengeId_scope: { challengeId, scope: "TEAM" } },
    include: {
      cells: {
        orderBy: [{ row: "asc" }, { col: "asc" }],
        include: {
          fills: {
            where: { teamId },
            orderBy: { createdAt: "asc" },
            include: { book: { select: { id: true, title: true, isGraphic: true, user: { select: { name: true } } } } },
          },
        },
      },
    },
  });
  if (!grid) return null;
  const cells = grid.cells.map((c) => {
    const weights = c.fills.map((f) => bookWeight(f.book.isGraphic));
    return {
      id: c.id,
      row: c.row,
      col: c.col,
      label: cellLabel(c.row, c.col),
      prompt: c.prompt,
      books: c.fills.map((f) => ({ id: f.book.id, title: f.book.title, isGraphic: f.book.isGraphic, owner: f.book.user.name ?? "?" })),
      weight: weights.reduce((n, w) => n + w, 0),
      complete: isComplete(weights),
    };
  });
  const lines = completedLines(cells.filter((c) => c.complete).map((c) => ({ row: c.row, col: c.col })), grid.size);
  return { id: grid.id, title: grid.title, size: grid.size, cells, completedLines: lines };
}

// ---------------------------------------------------------------------------
// Attach / detach with bonus accounting (called inside the book transaction)
// ---------------------------------------------------------------------------

async function completePositions(tx: Tx, gridId: string, teamId: string): Promise<CellPos[]> {
  const cells = await tx.bingoCell.findMany({
    where: { gridId },
    include: { fills: { where: { teamId }, include: { book: { select: { isGraphic: true } } } } },
  });
  return cells.filter((c) => isComplete(c.fills.map((f) => bookWeight(f.book.isGraphic)))).map((c) => ({ row: c.row, col: c.col }));
}

async function settleBonuses(tx: Tx, grid: { id: string; size: number; title: string; challengeId: string }, teamId: string, actorId: string, before: CellPos[], after: CellPos[]) {
  const challenge = await tx.challenge.findUniqueOrThrow({ where: { id: grid.challengeId } });
  const { gained, lost } = bingoDelta(before, after, grid.size);
  const prefix = `bingo:${grid.id}:team:${teamId}`;
  for (const key of gained) {
    await awardPoints(tx, {
      teamId,
      userId: actorId,
      source: "BINGO",
      baseAmount: key === "full" ? challenge.bingoFullBonus : challenge.bingoLineBonus,
      label: key === "full" ? `Bingo complet : ${grid.title}` : `Ligne de bingo : ${grid.title}`,
      refId: `${prefix}:${key}`,
    });
  }
  for (const key of lost) {
    const original = await tx.pointEvent.findFirst({ where: { refId: `${prefix}:${key}`, amount: { gt: 0 } }, orderBy: { createdAt: "desc" } });
    if (!original) continue;
    await awardPoints(tx, {
      teamId: original.teamId,
      userId: actorId,
      source: "BINGO",
      baseAmount: -original.baseAmount,
      rawAmount: -original.amount,
      label: `Annulation ligne de bingo : ${grid.title}`,
      refId: `${prefix}:${key}:undo`,
    });
  }
  return { gained, lost };
}

type BookRef = { id: string; isGraphic: boolean; userId: string };

/** Places a book on a cell of its team's board. Moves it if already placed elsewhere. */
export async function attachBookToCell(tx: Tx, book: BookRef, teamId: string, cellId: string, actorId: string) {
  const cell = await tx.bingoCell.findUniqueOrThrow({
    where: { id: cellId },
    include: { grid: true, fills: { where: { teamId }, include: { book: { select: { id: true, isGraphic: true } } } } },
  });
  if (cell.grid.challengeId !== (await tx.team.findUniqueOrThrow({ where: { id: teamId } })).challengeId) throw new Error("Grille invalide");
  const others = cell.fills.filter((f) => f.book.id !== book.id);
  if (isComplete(others.map((f) => bookWeight(f.book.isGraphic)))) throw new Error(`La case ${cellLabel(cell.row, cell.col)} est déjà complète`);
  if (others.length >= MAX_BOOKS_PER_SLOT) throw new Error(`La case ${cellLabel(cell.row, cell.col)} est pleine`);

  const before = await completePositions(tx, cell.gridId, teamId);
  await tx.bingoFill.upsert({ where: { bookId: book.id }, create: { bookId: book.id, cellId, teamId }, update: { cellId, teamId } });
  const after = await completePositions(tx, cell.gridId, teamId);
  const delta = await settleBonuses(tx, cell.grid, teamId, actorId, before, after);
  return { label: cellLabel(cell.row, cell.col), complete: after.some((p) => p.row === cell.row && p.col === cell.col), ...delta };
}

/** Removes a book from its cell (no-op when not placed). */
export async function detachBookFromCell(tx: Tx, bookId: string, actorId: string) {
  const fill = await tx.bingoFill.findUnique({ where: { bookId }, include: { cell: { include: { grid: true } } } });
  if (!fill) return null;
  const before = await completePositions(tx, fill.cell.gridId, fill.teamId);
  await tx.bingoFill.delete({ where: { bookId } });
  const after = await completePositions(tx, fill.cell.gridId, fill.teamId);
  await settleBonuses(tx, fill.cell.grid, fill.teamId, actorId, before, after);
  return fill.cellId;
}

/** Re-evaluates bonuses after a book's weight changed (graphique toggled) while placed. */
export async function resettleCell(tx: Tx, bookId: string, actorId: string, before: CellPos[] | null) {
  const fill = await tx.bingoFill.findUnique({ where: { bookId }, include: { cell: { include: { grid: true } } } });
  if (!fill || !before) return;
  const after = await completePositions(tx, fill.cell.gridId, fill.teamId);
  await settleBonuses(tx, fill.cell.grid, fill.teamId, actorId, before, after);
}

export async function snapshotCellPositions(tx: Tx, bookId: string): Promise<CellPos[] | null> {
  const fill = await tx.bingoFill.findUnique({ where: { bookId }, include: { cell: true } });
  return fill ? completePositions(tx, fill.cell.gridId, fill.teamId) : null;
}
