import "server-only";
import { after } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/db";
import type { PushCategory } from "@/lib/push/categories";
import { DEFAULT_TTL, type PushPayload } from "@/lib/push/payload";
import { shouldPrune, toggleMuted, uniqueIds } from "@/lib/push/recipients";

/**
 * Sending a web push, and remembering who agreed to receive one.
 *
 * Two rules hold this file together:
 * - **it never throws.** A notification is a courtesy; a push service being
 *   down, slow or rude must not roll back the reading, the vote or the answer
 *   that triggered it. Everything funnels through `Promise.allSettled` and a
 *   `[push]` warning.
 * - **the VAPID keys are read late.** `setVapidDetails` is called on the first
 *   send, never at import time: the CI build has no keys, and a module-level
 *   call would fail the build rather than the send.
 *
 * The decisions (who, which category, what to prune) live in `lib/push/*`,
 * pure and tested; this file only does the I/O.
 */

/** A browser subscription as `PushSubscription.toJSON()` hands it over. */
export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type NotifyResult = {
  /** Push services that accepted the message. */
  sent: number;
  /** Dead endpoints deleted along the way (404/410). */
  pruned: number;
  /** Temporary failures: the row stays, its counter moves. */
  failed: number;
};

/** Consecutive failures after which the tick drops a subscription. */
const MAX_FAILURES = 5;

/** A device that has not opened the app in six months is not coming back. */
const STALE_DAYS = 180;

/** Told once per process, not once per notification. */
let warnedMissingKeys = false;
let vapidReady = false;

/**
 * Configures `web-push` on the first send, and says whether it can send at all.
 * Deployments without keys (a CI build, a fork, a local clone) keep working:
 * every notification simply becomes a no-op.
 */
function vapidConfigured(): boolean {
  if (vapidReady) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    if (!warnedMissingKeys) {
      warnedMissingKeys = true;
      console.warn("[push] VAPID keys missing — notifications are disabled on this deployment.");
    }
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return true;
}

/**
 * Records a device. The endpoint is the identity: the same browser re-posting
 * its subscription lands on the same row, which is how a phone handed over to
 * somebody else follows the person now signed in. `failures` goes back to zero
 * because the browser has just proved the endpoint is alive.
 */
export async function savePushSubscription(userId: string, sub: PushSubscriptionInput, userAgent?: string | null): Promise<void> {
  const data = {
    userId,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    userAgent: userAgent ?? null,
    failures: 0,
    lastSeenAt: new Date(),
  };
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { endpoint: sub.endpoint, ...data },
    update: data,
  });
}

/**
 * « Désactiver sur cet appareil », and the sign-out path later on. Scoped to the
 * person: an endpoint alone must never let anyone unsubscribe somebody else.
 * A second click is a no-op, never an error.
 */
export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

/** Flips one switch of Aide. The muted list is per account, not per device. */
export async function setPushMuted(userId: string, category: PushCategory, enabled: boolean): Promise<PushCategory[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushMuted: true } });
  const muted = toggleMuted(user?.pushMuted ?? [], category, enabled);
  await prisma.user.update({ where: { id: userId }, data: { pushMuted: muted } });
  return muted;
}

/** What the Aide section shows: the switches, and the devices already signed up. */
export async function getPushSettings(userId: string): Promise<{
  muted: PushCategory[];
  devices: { endpoint: string; userAgent: string | null; createdAt: Date }[];
}> {
  const [user, devices] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { pushMuted: true } }),
    prisma.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return { muted: user?.pushMuted ?? [], devices };
}

/**
 * Sends one payload to every device of those people who did not mute its
 * category, in parallel, and tidies up after itself.
 *
 * `options.ignoreMuted` is there for the « Envoyer un test » button only: the
 * person just asked for that notification by hand, so answering « envoyé à 0
 * appareil » because a switch is off would read as a bug rather than a setting.
 *
 * Never throws, whatever the push services answer.
 */
export async function notifyUsers(userIds: string[], payload: PushPayload, options?: { ignoreMuted?: boolean }): Promise<NotifyResult> {
  const empty: NotifyResult = { sent: 0, pruned: 0, failed: 0 };

  const ids = uniqueIds(userIds.filter(Boolean));
  if (ids.length === 0) return empty;
  if (!vapidConfigured()) return empty;

  let subscriptions;
  try {
    subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: { in: ids },
        // The mute is read here, at send time: a switch flipped a second ago counts.
        ...(options?.ignoreMuted ? {} : { user: { NOT: { pushMuted: { has: payload.category } } } }),
      },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  } catch (error) {
    console.warn("[push] could not load subscriptions:", error);
    return empty;
  }
  if (subscriptions.length === 0) return empty;

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body, {
        TTL: payload.ttl ?? DEFAULT_TTL,
        // A push service that stops answering must not hold the request handler.
        timeout: 5000,
      }),
    ),
  );

  const dead: string[] = [];
  const shaky: string[] = [];
  let sent = 0;

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sent += 1;
      return;
    }
    const reason: unknown = result.reason;
    const statusCode = reason instanceof webpush.WebPushError ? reason.statusCode : undefined;
    if (shouldPrune(statusCode)) dead.push(subscriptions[i].id);
    else {
      shaky.push(subscriptions[i].id);
      console.warn(`[push] send failed (${statusCode ?? "no status"}):`, reason instanceof Error ? reason.message : reason);
    }
  });

  try {
    if (dead.length > 0) await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
    if (shaky.length > 0) await prisma.pushSubscription.updateMany({ where: { id: { in: shaky } }, data: { failures: { increment: 1 } } });
  } catch (error) {
    console.warn("[push] could not record the send outcome:", error);
  }

  return { sent, pruned: dead.length, failed: shaky.length };
}

/**
 * Housekeeping for the tick: endpoints that keep failing, and devices nobody has
 * opened for six months. A live device re-posts its subscription once per tab
 * session, so `lastSeenAt` really does say « still there ».
 */
export async function purgeStalePushSubscriptions(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.pushSubscription.deleteMany({
    where: { OR: [{ failures: { gte: MAX_FAILURES } }, { lastSeenAt: { lt: cutoff } }] },
  });
  return count;
}

/**
 * Fire-and-forget: the notification leaves after the response, so the player
 * never waits on a push service.
 *
 * `after` only exists inside a request scope. A script, a test or a cron helper
 * calling a service directly would see it throw, so the work then runs inline —
 * still caught, still never fatal for the caller.
 */
export function pushLater(fn: () => Promise<unknown>): void {
  const run = () => fn().catch((error: unknown) => console.warn("[push] notification dropped:", error));
  try {
    after(run);
  } catch {
    void run();
  }
}
