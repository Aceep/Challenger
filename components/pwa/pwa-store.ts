"use client";

import { useSyncExternalStore } from "react";

/**
 * Everything the browser says about installation, in one place.
 *
 * A `useSyncExternalStore` rather than a context: `beforeinstallprompt` fires
 * once, very early, usually before the « Installer » card is mounted.
 * `PwaBootstrap` attaches the listeners on entering the app; the card and the
 * Aide section read the snapshot whenever they show up.
 *
 * Server render: `getServerSnapshot` returns the neutral state, no listener.
 */

/** Chrome's own event, missing from lib.dom.d.ts. */
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type Platform = "ios" | "android" | "other";

export type PwaState = {
  /** The app is already running from the home screen. */
  standalone: boolean;
  platform: Platform;
  /** Set when Chrome offers the native install prompt (Android, desktop). */
  installEvent: InstallPromptEvent | null;
  pushSupported: boolean;
  permission: NotificationPermission | "unsupported";
};

const NEUTRAL: PwaState = {
  standalone: false,
  platform: "other",
  installEvent: null,
  pushSupported: false,
  permission: "unsupported",
};

let state: PwaState = NEUTRAL;
/** The listeners are attached once, however many components mount. */
let started = false;

const listeners = new Set<() => void>();

function emit(next: Partial<PwaState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const byMedia = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  // Safari knows nothing of `display-mode`, but sets this non-standard flag.
  const byNavigator = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return byMedia || byNavigator;
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // Since 13, iPadOS calls itself « Macintosh »: only the touch screen gives it away.
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "other";
}

function detectPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function detectPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/** Attaches the browser listeners. Idempotent, called by `PwaBootstrap`. */
export function startPwaStore() {
  if (started || typeof window === "undefined") return;
  started = true;

  emit({
    standalone: detectStandalone(),
    platform: detectPlatform(),
    pushSupported: detectPushSupported(),
    permission: detectPermission(),
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    // Without this `preventDefault`, Chrome shows its own banner and the event
    // can no longer be replayed from our button.
    event.preventDefault();
    emit({ installEvent: event as InstallPromptEvent });
  });

  window.addEventListener("appinstalled", () => emit({ installEvent: null, standalone: detectStandalone() }));

  const media = window.matchMedia?.("(display-mode: standalone)");
  media?.addEventListener?.("change", () => emit({ standalone: detectStandalone() }));
}

function subscribe(listener: () => void) {
  // A component may well mount before `PwaBootstrap` does in the tree.
  startPwaStore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => NEUTRAL;

export function usePwa(): PwaState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noSubscription = () => () => {};

/**
 * `false` on the server and during hydration, `true` afterwards.
 *
 * Everything downstream depends on the browser; without this guard the server
 * would render a card the client removes at once, and the page would jump.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/**
 * Opens the native install prompt. The event may only be used once, so it is
 * dropped straight away, accepted or dismissed.
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = state.installEvent;
  if (!event) return "unavailable";
  emit({ installEvent: null });
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  } catch {
    return "dismissed";
  }
}

/** Re-reads the notification permission after a request (for the push work). */
export function refreshPwaPermission() {
  emit({ permission: detectPermission() });
}
