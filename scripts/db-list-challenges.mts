/** Lists challenges + users (read-only): npx tsx --env-file=.env.local scripts/db-list-challenges.mts */
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../lib/generated/prisma/client";
neonConfig.webSocketConstructor = ws;
const p = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });
const challenges = await p.challenge.findMany({ orderBy: { startAt: "desc" }, select: { id: true, name: true, status: true, color: true, startAt: true, endAt: true, discordGuildId: true, _count: { select: { teams: true, members: true } } } });
const users = await p.user.findMany({ select: { id: true, name: true, discordId: true, isSuperAdmin: true, memberships: { select: { challengeId: true, role: true } } } });
console.log(JSON.stringify({ challenges, users }, null, 1));
await p.$disconnect();
