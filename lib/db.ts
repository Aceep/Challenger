import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Neon's serverless driver needs a WebSocket implementation outside the browser
// (used for transactions); plain queries go over HTTP, which avoids opening a
// socket on every cold start.
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Kept on globalThis in every environment: Fluid Compute reuses the instance
// across invocations, so the client and its pool are created once.
export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
