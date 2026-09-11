"use client";

import { useEffect } from "react";
import { startPwaStore } from "./pwa-store";

/**
 * Renders nothing: mounted at the top of both shells (player and admin), it
 * attaches the browser listeners from the very first page, before the
 * « Installer » card even exists — `beforeinstallprompt` only fires once.
 *
 * This is also where the service worker registration will hook in, once push
 * notifications land.
 */
export function PwaBootstrap() {
  useEffect(() => {
    startPwaStore();
  }, []);
  return null;
}
