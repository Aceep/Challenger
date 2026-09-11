"use client";

import { useRef } from "react";
import { LogoutIcon } from "@/components/ui/icons";
import { disablePush } from "./push-client";

/**
 * Sign out, and take this device's push subscription with it.
 *
 * A subscription belongs to a browser, not to an account: left behind, it would
 * keep ringing on a phone for someone who has logged out — and, worse, for the
 * next person to log in here. So the device unsubscribes first, then the form
 * submits the Server Action.
 *
 * Written as a real `<form action>`: with JavaScript off it posts and signs out
 * as before. With JavaScript on, `onSubmit` runs before React's own action
 * listener, so `preventDefault()` holds the action back; the second submit
 * (`requestSubmit`) goes through untouched.
 */

/** Never let a hung push service stand between someone and the door. */
const TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

export function SignOutForm({ action }: { action: () => Promise<void> }) {
  const form = useRef<HTMLFormElement>(null);
  const unsubscribed = useRef(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Second pass: let React run the Server Action.
    if (unsubscribed.current) return;
    event.preventDefault();
    unsubscribed.current = true;
    // Best effort only: a failed unsubscribe must never keep someone signed in.
    // The row is swept away by the next 410 or by the tick's purge.
    await withTimeout(disablePush(), TIMEOUT_MS).catch(() => null);
    form.current?.requestSubmit();
  }

  return (
    <form ref={form} action={action} onSubmit={onSubmit}>
      <button className="btn sm ghost">
        <LogoutIcon />
        Déconnexion
      </button>
    </form>
  );
}
