"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/dal";
import { isPushCategory } from "@/lib/push/categories";
import { testPayload } from "@/lib/push/payload";
import { notifyUsers, removePushSubscription, savePushSubscription, setPushMuted } from "@/lib/services/push";

/**
 * The four actions behind the « Notifications » section of Aide.
 *
 * They are called from a client component, so none of them redirects and none
 * of them throws: each returns a plain object the switch or the button can read.
 * `requireUser()` is the only authorization there is — a subscription belongs to
 * a person, never to a challenge, and every write is scoped to the session id.
 */

type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const GENERIC = "Une erreur est survenue. Réessaie dans un instant.";

/**
 * What the browser hands over in `PushSubscription.toJSON()`. The bounds are
 * there because the body comes from the client: an endpoint is a URL of a push
 * service, and the two keys are short base64url strings.
 */
const subscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
  }),
});

/** Records the device that just accepted notifications (or refreshes a known one). */
export async function subscribePushAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Cet abonnement est illisible. Réessaie depuis ton navigateur." };

  try {
    // Kept as-is: it is the only thing telling « iPhone » from « Chrome Android »
    // in the device list, and the person only ever sees their own.
    const userAgent = (await headers()).get("user-agent");
    await savePushSubscription(user.id, parsed.data, userAgent);
    return { ok: true };
  } catch (error) {
    console.warn("[push] subscribe failed:", error);
    return { ok: false, error: GENERIC };
  }
}

/** « Désactiver sur cet appareil »: the browser has already unsubscribed. */
export async function unsubscribePushAction(endpoint: string): Promise<ActionResult> {
  const user = await requireUser();
  if (typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > 2000) return { ok: false, error: GENERIC };

  try {
    await removePushSubscription(user.id, endpoint);
    return { ok: true };
  } catch (error) {
    console.warn("[push] unsubscribe failed:", error);
    return { ok: false, error: GENERIC };
  }
}

/** One switch. `enabled` is what the person sees: checked = receiving. */
export async function setPushMutedAction(category: string, enabled: boolean): Promise<ActionResult<{ muted: string[] }>> {
  const user = await requireUser();
  if (!isPushCategory(category)) return { ok: false, error: "Cette catégorie n’existe pas." };

  try {
    const muted = await setPushMuted(user.id, category, enabled === true);
    return { ok: true, muted };
  } catch (error) {
    console.warn("[push] mute failed:", error);
    return { ok: false, error: GENERIC };
  }
}

/**
 * « Envoyer un test »: proves the whole chain — keys, endpoint, service worker —
 * on the devices of the person who clicked, and on nobody else's.
 */
export async function sendTestPushAction(): Promise<ActionResult<{ sent: number; pruned: number; failed: number }>> {
  const user = await requireUser();

  try {
    // Awaited, not deferred: the button has a result to show.
    const result = await notifyUsers([user.id], testPayload(), { ignoreMuted: true });
    return { ok: true, ...result };
  } catch (error) {
    console.warn("[push] test failed:", error);
    return { ok: false, error: GENERIC };
  }
}
