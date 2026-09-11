import "server-only";
import { prisma } from "@/lib/db";
import { announceDormant, announceResolution, announceTieStage, announceWeekly, announceWindow } from "@/lib/discord/events";
import { sleep } from "@/lib/discord/rest";
import { once } from "@/lib/services/bot-events";
import { syncMemberRoles } from "@/lib/services/discord-setup";
import { purgeExpiredPendingReadings } from "@/lib/services/pending-reading";
import { purgeStalePushSubscriptions } from "@/lib/services/push";
import { syncQuestions } from "@/lib/services/questions";
import { advanceTieStages, dormantTeams, resolveExpiredVotes } from "@/lib/services/story";
import { dueSundayKey, isVerificationWindow, parisClock, parisInstant, sundayKey } from "@/lib/time/paris";

/**
 * Idempotent "clock tick": everything time-driven happens here — Sunday
 * verification window open/close, weekly leaderboard post (with catch-up),
 * expired votes, tie-cascade stages and dormant-chapter reminders.
 * Safe to call as often as wanted (cron, on activity): each announcement is
 * recorded in BotEvent so it is posted once.
 *
 * Several challenges run at once: the announcements of each ACTIVE edition are
 * done per challenge, while the story timers span every team of the platform.
 */

/** Pause between two role syncs, like the guild bootstrap's. */
const ROLE_PACE = 350;

export async function runTick(now = new Date(), onlyChallengeId?: string) {
  const challenges = await prisma.challenge.findMany({
    where: { status: "ACTIVE", ...(onlyChallengeId ? { id: onlyChallengeId } : {}) },
  });
  const out = {
    challenges: challenges.length,
    window: [] as string[],
    weekly: [] as string[],
    resolved: 0,
    tieStages: 0,
    dormant: 0,
    synced: 0,
    pending: 0,
    pushPurged: 0,
    rolesSynced: 0,
  };
  const { weekday, hour } = parisClock(now);

  for (const challenge of challenges) {
    const live = challenge.startAt <= now && now <= new Date(challenge.endAt.getTime() + 86_400_000);
    if (!live) continue;

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
        out.weekly.push(due);
      }
    }
  }

  // Story timers — they belong to the teams, whichever challenge they play.
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
  for (const challenge of challenges) {
    try {
      out.synced += (await syncQuestions(challenge.id)).imported;
    } catch (e) {
      console.error("[faq] sync failed", challenge.id, e);
    }
  }

  // Rôles Discord encore à poser : une personne invitée avant d'être sur le
  // serveur n'y était pas au moment de la synchro. Quelques membres par édition
  // et par tick, au rythme des mutations Discord, jamais fatal.
  for (const challenge of challenges) {
    if (!challenge.discordGuildId) continue;
    try {
      const waiting = await prisma.challengeMember.findMany({
        where: { challengeId: challenge.id, discordRoleSyncedAt: null },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: { userId: true },
      });
      for (const member of waiting) {
        if (await syncMemberRoles(member.userId, challenge.id)) out.rolesSynced++;
        await sleep(ROLE_PACE);
      }
    } catch (e) {
      console.error("[discord] reprise des rôles", challenge.id, e);
    }
  }

  // Discord « J'ai fini un livre » forms nobody came back to (never fatal).
  try {
    out.pending = await purgeExpiredPendingReadings(now);
  } catch (e) {
    console.error("[pending] purge failed", e);
  }

  // Push subscriptions nobody answers any more: dead endpoints and devices gone
  // silent for months (never fatal — the tick owes nothing to a push service).
  try {
    out.pushPurged = await purgeStalePushSubscriptions(now);
  } catch (e) {
    console.error("[push] purge failed", e);
  }
  return out;
}

const lastActivityTick = new Map<string, number>();

/**
 * Cheap tick to call from request handlers, throttled to one run per 5 minutes
 * per instance *and per challenge* — a busy edition never starves another.
 */
export async function tickOnActivity(challengeId?: string) {
  const now = Date.now();
  const key = challengeId ?? "*";
  if (now - (lastActivityTick.get(key) ?? 0) < 5 * 60_000) return;
  lastActivityTick.set(key, now);
  try {
    await runTick(new Date(now), challengeId);
  } catch (e) {
    console.error("tick failed", e);
  }
}
