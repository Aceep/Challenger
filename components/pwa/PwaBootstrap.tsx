"use client";

import { useEffect } from "react";
import { subscribePushAction } from "@/app/(player)/help/push-actions";
import { startPwaStore } from "./pwa-store";

/** One re-post per tab session is plenty to refresh `lastSeenAt`. */
const SYNCED = "ak-push-synced";

function alreadySynced(): boolean {
  try {
    return sessionStorage.getItem(SYNCED) !== null;
  } catch {
    // Private browsing, or storage blocked: re-posting once more is harmless.
    return false;
  }
}

function markSynced() {
  try {
    sessionStorage.setItem(SYNCED, "1");
  } catch {
    /* same */
  }
}

/**
 * Registers the service worker and re-posts an existing push subscription, once
 * per tab session.
 *
 * Why re-post: the endpoint belongs to the browser, not to the account. Someone
 * signing in on a shared phone, or coming back after the row was pruned, would
 * otherwise keep an endpoint pointing at the previous person — the upsert on
 * `endpoint` remaps it to whoever is signed in now, and refreshes `lastSeenAt`
 * so the six-month purge only ever hits devices that really are gone.
 */
async function syncPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (alreadySynced()) return;
  // Marked before the await: two tabs opening at once should not both post.
  markSynced();

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    // Nothing to refresh for a browser that never accepted notifications.
    if (subscription) await subscribePushAction(subscription.toJSON());
  } catch {
    /* no worker, no permission, offline: the section in Aide says what to do */
  }
}

/**
 * Renders nothing: mounted at the top of both shells (player and admin), it
 * attaches the browser listeners from the very first page, before the
 * « Installer » card even exists — `beforeinstallprompt` only fires once.
 *
 * It is also where `/sw.js` gets registered, so a player who accepted
 * notifications keeps receiving them without ever opening Aide again.
 */
export function PwaBootstrap() {
  useEffect(() => {
    startPwaStore();

    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      // `updateViaCache: "none"` so a new worker is picked up on the next visit
      // rather than sitting behind an HTTP cache for a day.
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => syncPushSubscription())
      .catch((error: unknown) => {
        // Insecure origin, or a browser refusing workers: push is simply off.
        console.warn("[push] service worker registration failed:", error);
      });
  }, []);
  return null;
}
