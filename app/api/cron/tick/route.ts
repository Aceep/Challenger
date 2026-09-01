import { NextResponse } from "next/server";
import { runTick } from "@/lib/services/tick";

/**
 * Time-driven tasks (Sunday window, weekly leaderboard, story timers).
 * Protected by CRON_SECRET (Vercel sends it as a Bearer token; an external
 * scheduler may also pass it as `?secret=`). Fails closed: with no CRON_SECRET
 * configured the route answers 401 rather than running for anybody — the proxy
 * lets /api/cron through without a session.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  if (!secret || (request.headers.get("authorization") !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runTick());
}
