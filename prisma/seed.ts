/**
 * Seed: first admin invite + a sample challenge with teams.
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

  const challenge =
    (await prisma.challenge.findFirst({ where: { status: "ACTIVE" } })) ??
    (await prisma.challenge.create({
      data: {
        name: "Book Challenge — édition test",
        startAt: now,
        endAt: end,
        status: "ACTIVE",
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
    create: { challengeId: challenge.id, discordId: adminDiscordId, role: "ADMIN" },
    update: { role: "ADMIN" },
  });
  // Existing account (re-seed): make sure it is admin.
  await prisma.user.updateMany({ where: { discordId: adminDiscordId }, data: { role: "ADMIN" } });

  console.log(`Seeded challenge "${challenge.name}" with 3 teams; admin invite for ${adminDiscordId}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
