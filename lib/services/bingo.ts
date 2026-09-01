import { GameError } from "@/lib/errors";
import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bingoDelta, completedLines, type CellPos } from "@/lib/scoring/bingo";
import { bookWeight, isComplete, MAX_BOOKS_PER_SLOT, type BookType } from "@/lib/scoring/reading";
import { awardPoints, reverseByRef } from "@/lib/services/points";

/**
 * Team bingo: an ordered series of grids shared by every team. Each team plays
 * one grid at a time (TeamGrid) and unlocks the next once all cells are
 * validated. A cell holds up to two readings and is complete once their
 * weights (roman 1, graphique ½) reach 1.
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
export type GridInput = z.infer<typeof gridSchema>;

function checkPrompts(input: GridInput) {
  const expected = input.size * input.size;
  const prompts = input.prompts.filter((p) => p.length > 0);
  if (prompts.length !== expected) throw new GameError(`Il faut exactement ${expected} consignes (une par ligne), ${prompts.length} reçues.`);
  return prompts;
}

async function writeCells(tx: Tx, gridId: string, size: number, prompts: string[]) {
  // Keep cell ids stable when only the prompt changes (fills reference cells).
  for (let i = 0; i < prompts.length; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    await tx.bingoCell.upsert({
      where: { gridId_row_col: { gridId, row, col } },
      create: { gridId, row, col, prompt: prompts[i] },
      update: { prompt: prompts[i] },
    });
  }
  await tx.bingoCell.deleteMany({ where: { gridId, OR: [{ row: { gte: size } }, { col: { gte: size } }] } });
}

/** Appends a grid at the end of the series. */
export async function createGrid(challengeId: string, input: GridInput) {
  const prompts = checkPrompts(input);
  return prisma.$transaction(async (tx) => {
    const last = await tx.bingoGrid.aggregate({ where: { challengeId }, _max: { order: true } });
    const grid = await tx.bingoGrid.create({ data: { challengeId, order: (last._max.order ?? 0) + 1, title: input.title, size: input.size } });
    await writeCells(tx, grid.id, input.size, prompts);
    return grid;
  });
}

/** Refuses to touch a grid of another edition — `gridId` always comes from a form. */
async function gridOf(tx: Tx, challengeId: string, gridId: string) {
  const grid = await tx.bingoGrid.findUnique({ where: { id: gridId }, select: { id: true, challengeId: true, order: true } });
  if (!grid || grid.challengeId !== challengeId) throw new GameError("Cette grille n'appartient pas à ce défi");
  return grid;
}

export async function updateGrid(challengeId: string, gridId: string, input: GridInput) {
  const prompts = checkPrompts(input);
  return prisma.$transaction(async (tx) => {
    await gridOf(tx, challengeId, gridId);
    const grid = await tx.bingoGrid.update({ where: { id: gridId }, data: { title: input.title, size: input.size } });
    await writeCells(tx, grid.id, input.size, prompts);
    return grid;
  });
}

/** Swaps a grid with its neighbour in the series. */
export async function moveGrid(challengeId: string, gridId: string, direction: "up" | "down") {
  return prisma.$transaction(async (tx) => {
    const grid = await gridOf(tx, challengeId, gridId);
    const other = await tx.bingoGrid.findFirst({
      where: { challengeId: grid.challengeId, order: direction === "up" ? { lt: grid.order } : { gt: grid.order } },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
    });
    if (!other) return;
    await tx.bingoGrid.update({ where: { id: grid.id }, data: { order: -1 } });
    await tx.bingoGrid.update({ where: { id: other.id }, data: { order: grid.order } });
    await tx.bingoGrid.update({ where: { id: grid.id }, data: { order: other.order } });
  });
}

/** Deletes a grid and renumbers the rest. */
export async function deleteGrid(challengeId: string, gridId: string) {
  return prisma.$transaction(async (tx) => {
    await gridOf(tx, challengeId, gridId);
    await tx.bingoGrid.delete({ where: { id: gridId } });
    const rest = await tx.bingoGrid.findMany({ where: { challengeId }, orderBy: { order: "asc" } });
    for (let i = 0; i < rest.length; i++) {
      if (rest[i].order !== i + 1) await tx.bingoGrid.update({ where: { id: rest[i].id }, data: { order: i + 1 } });
    }
  });
}

export function listGridsAdmin(challengeId: string) {
  return prisma.bingoGrid.findMany({
    where: { challengeId },
    orderBy: { order: "asc" },
    include: { cells: { orderBy: [{ row: "asc" }, { col: "asc" }] }, _count: { select: { teamGrids: true } } },
  });
}

// ---------------------------------------------------------------------------
// Team progression
// ---------------------------------------------------------------------------

/** "B3" style label: column letter + row number. */
export function cellLabel(row: number, col: number) {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

/** The team's active grid, opening the first pending one when needed. Null once the series is done. */
export async function activeGridForTeam(tx: Tx, teamId: string) {
  const current = await tx.teamGrid.findFirst({ where: { teamId, completedAt: null }, include: { grid: true } });
  if (current) return current.grid;
  const team = await tx.team.findUniqueOrThrow({ where: { id: teamId } });
  const done = await tx.teamGrid.findMany({ where: { teamId }, select: { gridId: true } });
  const next = await tx.bingoGrid.findFirst({
    where: { challengeId: team.challengeId, id: { notIn: done.map((d) => d.gridId) } },
    orderBy: { order: "asc" },
  });
  if (!next) return null;
  await tx.teamGrid.create({ data: { teamId, gridId: next.id } });
  return next;
}

const fillsOf = (teamId: string) => ({
  where: { teamId, book: { deletedAt: null } },
  orderBy: { createdAt: "asc" as const },
  include: { book: { select: { id: true, title: true, type: true, user: { select: { name: true } } } } },
});

export async function getTeamBoard(teamId: string) {
  // Fast path: the active grid already exists (one read); the transaction only runs to open the first / next grid.
  const grid = (await prisma.teamGrid.findFirst({ where: { teamId, completedAt: null }, include: { grid: true } }))?.grid ?? (await prisma.$transaction((tx) => activeGridForTeam(tx, teamId)));
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  const [total, history] = await Promise.all([
    prisma.bingoGrid.count({ where: { challengeId: team.challengeId } }),
    prisma.teamGrid.findMany({ where: { teamId, completedAt: { not: null } }, orderBy: { completedAt: "asc" }, include: { grid: { select: { order: true, title: true } } } }),
  ]);
  if (!grid) return { grid: null, total, history };
  const cells = await prisma.bingoCell.findMany({
    where: { gridId: grid.id },
    orderBy: [{ row: "asc" }, { col: "asc" }],
    include: { fills: fillsOf(teamId) },
  });
  const board = cells.map((c) => {
    const weights = c.fills.map((f) => bookWeight(f.book.type));
    return {
      id: c.id,
      row: c.row,
      col: c.col,
      label: cellLabel(c.row, c.col),
      prompt: c.prompt,
      books: c.fills.map((f) => ({ id: f.book.id, title: f.book.title, type: f.book.type, owner: f.book.user.name ?? "?" })),
      weight: weights.reduce((n, w) => n + w, 0),
      complete: isComplete(weights),
    };
  });
  const lines = completedLines(board.filter((c) => c.complete).map((c) => ({ row: c.row, col: c.col })), grid.size);
  return { grid: { id: grid.id, order: grid.order, title: grid.title, size: grid.size, cells: board, completedLines: lines }, total, history };
}

/** Positions of complete cells on a grid for a team (story gating, bonus deltas). */
export async function completePositions(tx: Tx, gridId: string, teamId: string): Promise<CellPos[]> {
  const cells = await tx.bingoCell.findMany({
    where: { gridId },
    include: { fills: { where: { teamId, book: { deletedAt: null } }, include: { book: { select: { type: true } } } } },
  });
  return cells.filter((c) => isComplete(c.fills.map((f) => bookWeight(f.book.type)))).map((c) => ({ row: c.row, col: c.col }));
}

// ---------------------------------------------------------------------------
// Attach / detach with bonus accounting (called inside the book transaction)
// ---------------------------------------------------------------------------

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
      label: key === "full" ? `Grille complète : ${grid.title}` : `Ligne de bingo : ${grid.title}`,
      refId: `${prefix}:${key}`,
    });
  }
  for (const key of lost) await reverseByRef(tx, `${prefix}:${key}`, actorId, `Annulation ligne de bingo : ${grid.title}`);
  return { gained, lost };
}

/** Closes the team's grid when every cell is validated and opens the next one. */
async function advanceIfComplete(tx: Tx, grid: { id: string; size: number }, teamId: string, after: CellPos[]): Promise<CellAttachResult["grid"]> {
  if (after.length < grid.size * grid.size) return null;
  const tg = await tx.teamGrid.findUnique({ where: { teamId_gridId: { teamId, gridId: grid.id } } });
  if (!tg || tg.completedAt) return null;
  await tx.teamGrid.update({ where: { id: tg.id }, data: { completedAt: new Date() } });
  const next = await activeGridForTeam(tx, teamId);
  return { completed: true as const, next: next ? { order: next.order, title: next.title } : null };
}

type BookRef = { id: string; type: BookType; userId: string };

export type CellAttachResult = {
  label: string;
  complete: boolean;
  gained: string[];
  lost: string[];
  /** A pending half freed by a roman completing the cell alone. */
  freed: { title: string; owner: string } | null;
  /** Set when this placement completed the grid. */
  grid: { completed: true; next: { order: number; title: string } | null } | null;
};

/** Places a reading on a cell of its team's active grid. Moves it if already placed elsewhere. */
export async function attachBookToCell(tx: Tx, book: BookRef, teamId: string, cellId: string, actorId: string): Promise<CellAttachResult> {
  const active = await activeGridForTeam(tx, teamId);
  const cell = await tx.bingoCell.findUniqueOrThrow({ where: { id: cellId }, include: { grid: true, fills: fillsOf(teamId) } });
  if (!active || cell.gridId !== active.id) throw new GameError("Cette case n'est pas sur la grille en cours de ton équipe");
  const label = cellLabel(cell.row, cell.col);
  const others = cell.fills.filter((f) => f.book.id !== book.id);
  if (isComplete(others.map((f) => bookWeight(f.book.type)))) throw new GameError(`La case ${label} est déjà validée`);
  if (others.length >= MAX_BOOKS_PER_SLOT) throw new GameError(`La case ${label} est pleine`);

  const before = await completePositions(tx, cell.gridId, teamId);
  // A roman validates the cell alone: the pending half goes back to "en attente".
  let freed: CellAttachResult["freed"] = null;
  if (book.type === "ROMAN" && others.length) {
    await tx.bingoFill.delete({ where: { bookId: others[0].book.id } });
    freed = { title: others[0].book.title, owner: others[0].book.user.name ?? "?" };
  }
  const previous = await tx.bingoFill.findUnique({ where: { bookId: book.id }, include: { cell: { include: { grid: true } } } });
  const previousBefore = previous && previous.gridId !== cell.gridId ? await completePositions(tx, previous.gridId, teamId) : null;
  await tx.bingoFill.upsert({ where: { bookId: book.id }, create: { bookId: book.id, cellId, gridId: cell.gridId, teamId }, update: { cellId, gridId: cell.gridId, teamId } });
  if (previous && previousBefore) {
    await settleBonuses(tx, previous.cell.grid, teamId, actorId, previousBefore, await completePositions(tx, previous.gridId, teamId));
  }
  const after = await completePositions(tx, cell.gridId, teamId);
  const delta = await settleBonuses(tx, cell.grid, teamId, actorId, before, after);
  const grid = await advanceIfComplete(tx, cell.grid, teamId, after);
  return { label, complete: after.some((p) => p.row === cell.row && p.col === cell.col), ...delta, freed, grid };
}

/** Removes a reading from its cell (no-op when not placed). The cell drops back to "en attente". */
export async function detachBookFromCell(tx: Tx, bookId: string, actorId: string) {
  const fill = await tx.bingoFill.findUnique({ where: { bookId }, include: { cell: { include: { grid: true } } } });
  if (!fill) return null;
  const before = await completePositions(tx, fill.gridId, fill.teamId);
  await tx.bingoFill.delete({ where: { bookId } });
  const after = await completePositions(tx, fill.gridId, fill.teamId);
  await settleBonuses(tx, fill.cell.grid, fill.teamId, actorId, before, after);
  return fill.cellId;
}

/** Re-evaluates bonuses after a reading's type changed while placed. */
export async function resettleCell(tx: Tx, bookId: string, actorId: string, before: CellPos[] | null) {
  const fill = await tx.bingoFill.findUnique({ where: { bookId }, include: { cell: { include: { grid: true } } } });
  if (!fill || !before) return;
  const after = await completePositions(tx, fill.gridId, fill.teamId);
  await settleBonuses(tx, fill.cell.grid, fill.teamId, actorId, before, after);
  await advanceIfComplete(tx, fill.cell.grid, fill.teamId, after);
}

export async function snapshotCellPositions(tx: Tx, bookId: string): Promise<CellPos[] | null> {
  const fill = await tx.bingoFill.findUnique({ where: { bookId } });
  return fill ? completePositions(tx, fill.gridId, fill.teamId) : null;
}
