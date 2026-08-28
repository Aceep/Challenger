import "server-only";
import { prisma } from "@/lib/db";
import { announceDormant, announceResolution, announceTieStage, announceWeekly, announceWindow } from "@/lib/discord/events";
import { syncQuestions } from "@/lib/services/questions";
import { advanceTieStages, dormantTeams, resolveExpiredVotes } from "@/lib/services/story";
import { dueSundayKey, isVerificationWindow, parisClock, parisInstant, sundayKey } from "@/lib/time/paris";

/**
 * Idempotent "clock tick": everything time-driven happens here — Sunday
 * verification window open/close, weekly leaderboard post (with catch-up),
 * expired votes, tie-cascade stages and dormant-chapter reminders.
 * Safe to call as often as wanted (cron, on activity): each announcement is
 * recorded in BotEvent so it is posted once.
 */

/** Runs `fn` once per `key` (no-op when already done). */
async function once(key: string, fn: () => Promise<void>) {
  const done = await prisma.botEvent.findUnique({ where: { key } });
  if (done) return false;
  await prisma.botEvent.create({ data: { key } });
  await fn();
  return true;
}

export async function runTick(now = new Date()) {
  const challenge = await prisma.challenge.findFirst({ where: { status: "ACTIVE" } });
  const out = { window: [] as string[], weekly: null as string | null, resolved: 0, tieStages: 0, dormant: 0, synced: 0 };
  if (!challenge) return out;
  const live = challenge.startAt <= now && now <= new Date(challenge.endAt.getTime() + 86_400_000);
  const { weekday, hour } = parisClock(now);

  if (live) {
    // Verification window: Sunday 19:00–21:00 Paris.
    const key = sundayKey(now);
    if (isVerificationWindow(now) && (await once(`window-open:${challenge.id}:${key}`, () => announceWindow(challenge.id, "open")))) out.window.push("open");
    if (weekday === 0 && hour >= 21 && (await once(`window-close:${challenge.id}:${key}`, () => announceWindow(challenge.id, "close")))) out.window.push("close");

    // Weekly leaderboard: Sunday 20:00 Paris, posted late if missed (catch-up).
    const due = dueSundayKey(now);
    const dueAt = parisInstant(due, 20);
    if (dueAt >= challenge.startAt && dueAt <= new Date(challenge.endAt.getTime() + 7 * 86_400_000)) {
      const late = now.getTime() - dueAt.getTime() > 30 * 60_000;
      if (await once(`weekly:${challenge.id}:${due}`, () => announceWeekly(challenge.id, due, late))) {
        await prisma.challenge.update({ where: { id: challenge.id }, data: { lastWeeklyPostAt: now } });
        out.weekly = due;
      }
    }
  }

  // Story timers.
  const results = await resolveExpiredVotes(now);
  for (const r of results) await announceResolution(r);
  out.resolved = results.length;
  for (const v of await advanceTieStages(now)) {
    if (await once(`tie:${v.id}:${v.stage}`, () => announceTieStage(v))) out.tieStages++;
  }
  for (const d of await dormantTeams(7, now)) {
    if (await once(`dormant:${d.teamId}:${d.nodeId}:${sundayKey(now)}`, () => announceDormant(d))) out.dormant++;
  }

  // FAQ: pull back the replies typed inside Discord (throttled, never fatal).
  try {
    out.synced = (await syncQuestions(challenge.id)).imported;
  } catch (e) {
    console.error("[faq] sync failed", e);
  }
  return out;
}

let lastActivityTick = 0;

/** Cheap tick to call from request handlers (throttled to one run per 5 minutes per instance). */
export async function tickOnActivity() {
  const now = Date.now();
  if (now - lastActivityTick < 5 * 60_000) return;
  lastActivityTick = now;
  try {
    await runTick(new Date(now));
  } catch (e) {
    console.error("tick failed", e);
  }
}
