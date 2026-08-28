import "server-only";
import { prisma } from "@/lib/db";

/**
 * First-login guided tour. `onboardedAt` is user metadata, not game data:
 * no `assertWritable` — finishing Kyle's visit stays possible during the
 * Sunday verification window.
 */
export async function markOnboarded(userId: string): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId, onboardedAt: null }, data: { onboardedAt: new Date() } });
}
