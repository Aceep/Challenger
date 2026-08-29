import "server-only";
import { prisma } from "@/lib/db";
import {
  isPendingExpired,
  pendingExpiry,
  pendingPurgeCutoff,
  readPendingChoices,
  resolvePendingChoice,
  type PendingChoices,
  type PendingField,
} from "@/lib/discord/pending";
import { GameError } from "@/lib/errors";

/**
 * The state of the Discord « J'ai fini un livre » flow between the modal
 * (titre / auteur / pages) and « Valider » (type, quête, case).
 *
 * Why a row and not a signed token: the modal values do not fit in the 100
 * characters of a `custom_id`, the three selections have to accumulate, and a
 * short-lived row gives a natural TTL. The row id is what travels in the child
 * `custom_id`s; the ephemeral message id is only defence in depth.
 *
 * Every read re-checks *who* clicks and *where*, so an id copied out of one
 * ephemeral cannot be replayed by someone else or from another salon.
 */

export { PENDING_TTL_MS, type PendingChoices } from "@/lib/discord/pending";

/** A pending row as stored. */
export type PendingReading = NonNullable<Awaited<ReturnType<typeof prisma.pendingReading.findUnique>>>;

/** Espace insécable, exigé par la typographie française. */
const NBSP = " ";

const EXPIRED = `Cette fiche a expiré (15${NBSP}min). Reclique sur «${NBSP}J’ai fini un livre${NBSP}».`;
const NOT_YOURS = "Ce n’est pas ta fiche de lecture.";
/** The frozen snapshot is the only authority: anything else was forged, or has gone stale. */
const UNKNOWN_OPTION = `Ce choix n’a pas été proposé pour cette fiche${NBSP}: recommence.`;
const wrongChannel = (channelId: string) => `Ce bouton ne marche que dans la librairie de ton équipe (<#${channelId}>).`;

/** Freezes what the modal captured, plus the two menus, for 15 min. */
export function createPendingReading(input: {
  userId: string;
  challengeId: string;
  teamId: string | null;
  channelId: string;
  title: string;
  author: string;
  pages: number;
  choices: PendingChoices;
}) {
  return prisma.pendingReading.create({
    data: {
      userId: input.userId,
      challengeId: input.challengeId,
      teamId: input.teamId,
      channelId: input.channelId,
      title: input.title,
      author: input.author,
      pages: input.pages,
      options: { quests: input.choices.quests, cells: input.choices.cells },
      expiresAt: pendingExpiry(),
    },
  });
}

/**
 * The row, or a French `GameError`. A consumed or purged row reads like an
 * expired one: from the player's side the form is over either way.
 */
export async function loadPendingReading(id: string, userId: string, channelId: string | null, now = new Date()): Promise<PendingReading> {
  const pending = await prisma.pendingReading.findUnique({ where: { id } });
  if (!pending) throw new GameError(EXPIRED);
  if (pending.userId !== userId) throw new GameError(NOT_YOURS);
  if (pending.channelId !== channelId) throw new GameError(wrongChannel(pending.channelId));
  if (isPendingExpired(pending, now)) throw new GameError(EXPIRED);
  return pending;
}

/**
 * Load *and* take the row in one go: the delete is the lock. Two « Valider »
 * clicks race on the same id, and only the one whose `deleteMany` reports a
 * deleted row may go on to write the reading — the loser reads like an expired
 * form, which is exactly what it is now.
 */
export async function claimPendingReading(id: string, userId: string, channelId: string | null, now = new Date()): Promise<PendingReading> {
  const pending = await loadPendingReading(id, userId, channelId, now);
  const { count } = await prisma.pendingReading.deleteMany({ where: { id, userId } });
  if (count === 0) throw new GameError(EXPIRED);
  return pending;
}

/** One dropdown change, validated against the row's own frozen options. */
export async function setPendingChoice(
  id: string,
  userId: string,
  channelId: string | null,
  field: PendingField,
  value: string,
  now = new Date(),
): Promise<PendingReading> {
  const pending = await loadPendingReading(id, userId, channelId, now);
  const patch = resolvePendingChoice(field, value, readPendingChoices(pending.options));
  if (!patch) throw new GameError(UNKNOWN_OPTION);
  return prisma.pendingReading.update({ where: { id }, data: patch });
}

/** Drops the row once the reading is saved (or cancelled). Never throws on a double click. */
export async function consumePendingReading(id: string): Promise<void> {
  await prisma.pendingReading.deleteMany({ where: { id } });
}

/** Housekeeping, called by the tick: forms abandoned long enough that nobody will click them. */
export async function purgeExpiredPendingReadings(now = new Date()): Promise<number> {
  const { count } = await prisma.pendingReading.deleteMany({ where: { expiresAt: { lt: pendingPurgeCutoff(now) } } });
  return count;
}
