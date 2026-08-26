import "server-only";
import { prisma } from "@/lib/db";
import type { PointSource } from "@/lib/generated/prisma/enums";
import { applyMultiplier, effectiveMultiplier, isWithinChallenge } from "@/lib/scoring/reading";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type AwardInput = {
  teamId: string;
  userId?: string;
  source: PointSource;
  baseAmount: number;
  label: string;
  bookId?: string;
  refId?: string;
  /** Skip modifiers (e.g. undo events must mirror the original amount exactly). */
  rawAmount?: number;
  at?: Date;
};

/**
 * Writes one ledger entry. Returns null when outside the challenge window
 * (the action itself still succeeds, it just earns nothing).
 */
export async function awardPoints(tx: Tx, input: AwardInput) {
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

  return tx.pointEvent.create({
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
}
