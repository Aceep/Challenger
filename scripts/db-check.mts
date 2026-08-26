/** Quick DB snapshot for debugging: npm run db:check */
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../lib/generated/prisma/client";

neonConfig.webSocketConstructor = ws;
const p = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

const [users, invites, books, events] = await Promise.all([
  p.user.findMany({ select: { name: true, role: true, discordId: true, membership: { select: { teamId: true } } } }),
  p.invite.findMany({ select: { discordId: true, usedAt: true, role: true } }),
  p.book.findMany({ select: { title: true, pages: true } }),
  p.pointEvent.findMany({ select: { source: true, amount: true, label: true } }),
]);
console.log(JSON.stringify({ users, invites, books, events }, null, 1));
await p.$disconnect();
