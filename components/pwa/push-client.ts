"use client";

import { subscribePushAction, unsubscribePushAction } from "@/app/(player)/help/push-actions";
import { refreshPwaPermission } from "./pwa-store";

/**
 * The browser side of the push subscription: ask, subscribe, tell the server.
 *
 * `enablePush` **must** be called straight from a click. Safari (and Chrome on
 * Android when the permission was reset) only honours `requestPermission()`
 * inside a user gesture; called from an effect it rejects without a prompt.
 */

/**
 * The VAPID public key travels to the browser as base64url; `subscribe()` wants
 * the raw bytes. Standard conversion: restore the padding and the two characters
 * base64url replaces, then decode.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  // The buffer is spelled out so the array is a plain `ArrayBuffer` one, which
  // is what `applicationServerKey` accepts (a `SharedArrayBuffer` would not do).
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** The registration, once the worker is actually usable. */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export type EnableResult = "granted" | "denied" | "unsupported" | "error";

/**
 * Asks for the permission, subscribes this browser and records it server-side.
 * Returns what to show, never throws.
 */
export async function enablePush(): Promise<EnableResult> {
  if (typeof window === "undefined" || !("Notification" in window) || !("PushManager" in window)) return "unsupported";

  try {
    const permission = await Notification.requestPermission();
    // The store paints the section from `permission`, so it has to be re-read
    // whatever the answer — « refusé » is a state to show, not a silent failure.
    refreshPwaPermission();
    if (permission !== "granted") return "denied";

    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return "unsupported";

    const reg = await registration();
    if (!reg) return "unsupported";

    const subscription =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        // Required by every browser: a push must always end up on screen.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      }));

    const result = await subscribePushAction(subscription.toJSON());
    return result.ok ? "granted" : "error";
  } catch {
    refreshPwaPermission();
    return "error";
  }
}

/** Drops this browser's subscription, here and on the server. Idempotent. */
export async function disablePush(): Promise<boolean> {
  try {
    const reg = await registration();
    const subscription = await reg?.pushManager.getSubscription();
    if (!subscription) return true;

    const { endpoint } = subscription;
    // Unsubscribe first: if the server call fails, the browser has still stopped
    // receiving, and the row is swept away by the next 410 or by the tick.
    await subscription.unsubscribe();
    const result = await unsubscribePushAction(endpoint);
    return result.ok;
  } catch {
    return false;
  }
}

/** This browser's endpoint, to tell « activé ici » from « activé ailleurs ». */
export async function currentEndpoint(): Promise<string | null> {
  try {
    const reg = await registration();
    const subscription = await reg?.pushManager.getSubscription();
    return subscription?.endpoint ?? null;
  } catch {
    return null;
  }
}
