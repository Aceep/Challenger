import "server-only";
import { prisma } from "@/lib/db";

/**
 * Idempotency marks for everything the bot says once: window announcements,
 * the Sunday leaderboard post, tie reminders, welcome messages…
 * Shared by `lib/services/tick.ts` and `lib/services/discord-setup.ts`.
 */

/** Runs `fn` once per `key` (no-op when already done). Returns true when it ran. */
export async function once(key: string, fn: () => Promise<void>): Promise<boolean> {
  const done = await prisma.botEvent.findUnique({ where: { key } });
  if (done) return false;
  await prisma.botEvent.create({ data: { key } });
  await fn();
  return true;
}
