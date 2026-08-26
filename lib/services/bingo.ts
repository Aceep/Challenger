import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { BingoScope } from "@/lib/generated/prisma/enums";
import { bingoDelta, type CellPos } from "@/lib/scoring/bingo";
import { awardPoints } from "@/lib/services/points";

/** Owner of a set of fills: a player (own grid) or a team (team grid). */
export type BingoOwner = { scope: "PLAYER"; userId: string; teamId: string | null } | { scope: "TEAM"; teamId: string };

function ownerWhere(owner: BingoOwner) {
  return owner.scope === "PLAYER" ? { userId: owner.userId } : { teamId: owner.teamId };
}

function ownerKey(owner: BingoOwner) {
  return owner.scope === "PLAYER" ? `user:${owner.userId}` : `team:${owner.teamId}`;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const gridSchema = z.object({
  scope: z.enum(["PLAYER", "TEAM"]),
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
      where: { challengeId_scope: { challengeId, scope: input.scope } },
      create: { challengeId, scope: input.scope, title: input.title, size: input.size },
      update: { title: input.title, size: input.size },
      include: { cells: true },
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
    // Drop cells outside the (possibly shrunk) grid.
    await tx.bingoCell.deleteMany({
      where: { gridId: grid.id, OR: [{ row: { gte: input.size } }, { col: { gte: input.size } }] },
    });
    return grid;
  });
}

export function deleteGrid(challengeId: string, scope: BingoScope) {
  return prisma.bingoGrid.delete({ where: { challengeId_scope: { challengeId, scope } } });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getGridWithFills(challengeId: string, owner: BingoOwner) {
  const grid = await prisma.bingoGrid.findUnique({
    where: { challengeId_scope: { challengeId, scope: owner.scope } },
    include: {
      cells: {
        orderBy: [{ row: "asc" }, { col: "asc" }],
        include: {
          fills: {
            where: ownerWhere(owner),
            include: { book: { select: { id: true, title: true, author: true, userId: true } } },
          },
        },
      },
    },
  });
  if (!grid) return null;
  return {
    ...grid,
    cells: grid.cells.map((c) => ({ ...c, fill: c.fills[0] ?? null })),
  };
}

// ---------------------------------------------------------------------------
// Fill / unfill with bonus accounting
// ---------------------------------------------------------------------------

async function currentPositions(tx: Tx, gridId: string, owner: BingoOwner): Promise<CellPos[]> {
  const fills = await tx.bingoFill.findMany({
    where: { ...ownerWhere(owner), cell: { gridId } },
    include: { cell: { select: { row: true, col: true } } },
  });
  return fills.map((f) => ({ row: f.cell.row, col: f.cell.col }));
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Awards / reverses bonuses for the line delta. `teamId` receives the points. */
async function settleBonuses(
  tx: Tx,
  opts: { grid: { id: string; size: number; title: string }; owner: BingoOwner; teamId: string; userId?: string; before: CellPos[]; after: CellPos[] },
) {
  const challenge = await tx.challenge.findFirstOrThrow({ where: { bingoGrids: { some: { id: opts.grid.id } } } });
  const { gained, lost } = bingoDelta(opts.before, opts.after, opts.grid.size);
  const prefix = `bingo:${opts.grid.id}:${ownerKey(opts.owner)}`;

  for (const key of gained) {
    const base = key === "full" ? challenge.bingoFullBonus : challenge.bingoLineBonus;
    await awardPoints(tx, {
      teamId: opts.teamId,
      userId: opts.userId,
      source: "BINGO",
      baseAmount: base,
      label: key === "full" ? `Bingo complet : ${opts.grid.title}` : `Ligne de bingo : ${opts.grid.title}`,
      refId: `${prefix}:${key}`,
    });
  }
  for (const key of lost) {
    const original = await tx.pointEvent.findFirst({
      where: { refId: `${prefix}:${key}`, amount: { gt: 0 } },
      orderBy: { createdAt: "desc" },
    });
    if (!original) continue;
    await awardPoints(tx, {
      teamId: original.teamId,
      userId: opts.userId,
      source: "BINGO",
      baseAmount: -original.baseAmount,
      rawAmount: -original.amount,
      label: `Annulation ligne de bingo : ${opts.grid.title}`,
      refId: `${prefix}:${key}:undo`,
    });
  }
  return { gained, lost };
}

export async function fillCell(owner: BingoOwner, teamId: string | null, cellId: string, bookId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const cell = await tx.bingoCell.findUniqueOrThrow({ where: { id: cellId }, include: { grid: true } });
    if (cell.grid.scope !== owner.scope) throw new Error("Grille invalide");

    const book = await tx.book.findUniqueOrThrow({ where: { id: bookId }, include: { user: { include: { membership: true } } } });
    if (owner.scope === "PLAYER" && book.userId !== owner.userId) throw new Error("Ce livre n'est pas à toi");
    if (owner.scope === "TEAM" && book.user.membership?.teamId !== owner.teamId) throw new Error("Ce livre n'appartient pas à l'équipe");

    // A book fills at most one cell per grid/owner.
    await tx.bingoFill.deleteMany({ where: { ...ownerWhere(owner), bookId, cell: { gridId: cell.gridId } } });

    const before = await currentPositions(tx, cell.gridId, owner);
    await tx.bingoFill.upsert({
      where: owner.scope === "PLAYER" ? { cellId_userId: { cellId, userId: owner.userId } } : { cellId_teamId: { cellId, teamId: owner.teamId } },
      create: { cellId, bookId, ...ownerWhere(owner) },
      update: { bookId },
    });
    const after = await currentPositions(tx, cell.gridId, owner);

    if (!teamId) return { gained: [], lost: [] };
    return settleBonuses(tx, { grid: cell.grid, owner, teamId, userId: actorId, before, after });
  });
}

export async function unfillCell(owner: BingoOwner, teamId: string | null, cellId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const cell = await tx.bingoCell.findUniqueOrThrow({ where: { id: cellId }, include: { grid: true } });
    const before = await currentPositions(tx, cell.gridId, owner);
    await tx.bingoFill.deleteMany({ where: { cellId, ...ownerWhere(owner) } });
    const after = await currentPositions(tx, cell.gridId, owner);
    if (!teamId) return { gained: [], lost: [] };
    return settleBonuses(tx, { grid: cell.grid, owner, teamId, userId: actorId, before, after });
  });
}
