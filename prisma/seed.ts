/**
 * Seed: a sample challenge with its teams, plus the first organiser (invitation
 * and, when the account already exists, membership + platform super-admin).
 * Usage: ADMIN_DISCORD_ID=<your discord id> npm run db:seed (loads .env.local)
 */
import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../lib/generated/prisma/client";

neonConfig.webSocketConstructor = ws;
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const adminDiscordId = process.env.ADMIN_DISCORD_ID;
  if (!adminDiscordId) throw new Error("ADMIN_DISCORD_ID is required (your Discord user id)");

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 3);

  // Several challenges coexist: find this one by name rather than "the active one".
  const name = "Book Challenge — édition test";
  const challenge =
    (await prisma.challenge.findFirst({ where: { name } })) ??
    (await prisma.challenge.create({
      data: {
        name,
        startAt: now,
        endAt: end,
        status: "ACTIVE",
        discordGuildId: process.env.DISCORD_GUILD_ID || null,
      },
    }));

  for (const [name, color] of [
    ["Les Dragons", "#dc2626"],
    ["Les Hiboux", "#2563eb"],
    ["Les Renards", "#d97706"],
  ] as const) {
    await prisma.team.upsert({
      where: { challengeId_name: { challengeId: challenge.id, name } },
      create: { challengeId: challenge.id, name, color },
      update: {},
    });
  }

  await prisma.invite.upsert({
    where: { challengeId_discordId: { challengeId: challenge.id, discordId: adminDiscordId } },
    create: { challengeId: challenge.id, discordId: adminDiscordId, role: "ORGANIZER" },
    update: { role: "ORGANIZER" },
  });

  // Existing account (re-seed): platform super-admin and organiser of this edition.
  const admin = await prisma.user.findUnique({ where: { discordId: adminDiscordId }, select: { id: true } });
  if (admin) {
    await prisma.user.update({ where: { id: admin.id }, data: { isSuperAdmin: true } });
    await prisma.challengeMember.upsert({
      where: { challengeId_userId: { challengeId: challenge.id, userId: admin.id } },
      create: { challengeId: challenge.id, userId: admin.id, role: "ORGANIZER" },
      update: { role: "ORGANIZER" },
    });
  }

  console.log(`Seeded challenge "${challenge.name}" with 3 teams; organiser invite for ${adminDiscordId}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
