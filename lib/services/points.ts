import "server-only";
import { prisma } from "@/lib/db";
import type { PointSource } from "@/lib/generated/prisma/enums";
import { applyMultiplier, effectiveMultiplier, isWithinChallenge } from "@/lib/scoring/reading";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type AwardInput = {
  teamId: string;
  userId?: string;
  source: PointSource;
  /** One decimal max (readings), integers elsewhere. */
  baseAmount: number;
  label: string;
  bookId?: string;
  refId?: string;
  /** Skip modifiers (e.g. undo events must mirror the original amount exactly). */
  rawAmount?: number;
  at?: Date;
};

/** Ledger amounts are stored as Decimal(8,1); read them back as numbers. */
export const num = (d: { toString(): string } | number | null | undefined) => (d == null ? 0 : Number(d));

/**
 * Writes one ledger entry. Returns null when outside the challenge window
 * (the action itself still succeeds, it just earns nothing).
 */
export async function awardPoints(tx: Tx, input: AwardInput): Promise<{ id: string; amount: number; teamId: string } | null> {
  const at = input.at ?? new Date();
  const team = await tx.team.findUniqueOrThrow({
    where: { id: input.teamId },
    include: {
      challenge: true,
      modifiers: { where: { startAt: { lte: at }, endAt: { gt: at } } },
    },
  });

  if (!isWithinChallenge(at, team.challenge.startAt, team.challenge.endAt)) return null;

  const multiplier = input.rawAmount !== undefined ? 1 : effectiveMultiplier(team.modifiers, at);
  const amount = input.rawAmount ?? applyMultiplier(input.baseAmount, multiplier);

  const ev = await tx.pointEvent.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      source: input.source,
      baseAmount: input.baseAmount,
      multiplier,
      amount,
      label: input.label,
      bookId: input.bookId,
      refId: input.refId,
      createdAt: at,
    },
  });
  return { id: ev.id, amount, teamId: ev.teamId };
}

/** Writes the exact negative of the latest positive event carrying `refId` (no-op when none). */
export async function reverseByRef(tx: Tx, refId: string, actorId: string, label: string) {
  const original = await tx.pointEvent.findFirst({ where: { refId, amount: { gt: 0 } }, orderBy: { createdAt: "desc" } });
  if (!original) return null;
  const undone = await tx.pointEvent.findFirst({ where: { refId: `${refId}:undo`, createdAt: { gt: original.createdAt } } });
  if (undone) return null;
  return awardPoints(tx, {
    teamId: original.teamId,
    userId: actorId,
    source: original.source,
    baseAmount: -num(original.baseAmount),
    rawAmount: -num(original.amount),
    label,
    refId: `${refId}:undo`,
  });
}
