import { NextResponse } from "next/server";
import { announceResolution } from "@/lib/discord/events";
import { resolveExpiredVotes } from "@/lib/services/story";

/** Vercel Cron: settles expired story votes. Protected by CRON_SECRET (Vercel sends it as a Bearer token). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await resolveExpiredVotes();
  for (const r of results) await announceResolution(r);
  return NextResponse.json({ resolved: results.length });
}
