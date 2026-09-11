"use client";

import { useState } from "react";
import { Card, Kyle } from "@/components/ui";
import { InstallSteps } from "./InstallSteps";
import { useMounted, usePwa } from "./pwa-store";

/** A « non merci » that outlives the visit. */
const DISMISSED = "ak-install-dismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) !== null;
  } catch {
    /* private browsing: the card will come back, so be it */
    return false;
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISSED, "1");
  } catch {
    /* same: the dismissal only lasts for this page */
  }
}

/** A finger, not a mouse: the card says nothing useful on a desktop. */
function readCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

/**
 * « Installe Challenger sur ton téléphone », under the home page title.
 *
 * It only addresses a phone or a tablet (coarse pointer) that does not already
 * have the app, and goes away for good on « Plus tard ». Nothing is rendered on
 * the first pass: the state comes from the browser, and showing the card before
 * mount would make the page flicker.
 */
export function InstallCard() {
  const { standalone, platform, installEvent } = usePwa();
  const mounted = useMounted();
  // Read once, at hydration: neither of them changes during the visit.
  const [dismissed, setDismissed] = useState(readDismissed);
  const [coarse] = useState(readCoarsePointer);

  if (!mounted || dismissed || standalone || !coarse) return null;

  return (
    <Card tier="flat" className="help-card flex items-start gap-4">
      <Kyle width={48} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          {/* `.help-card h3` already carries the bottom margin. */}
          <h3>Installe Challenger sur ton téléphone</h3>
          <p className="meta">Une icône sur l’écran d’accueil, plein écran, sans barre d’adresse.</p>
        </div>
        <InstallSteps platform={platform} installEvent={installEvent} />
        <button
          type="button"
          className="btn sm ghost self-start"
          onClick={() => {
            writeDismissed();
            setDismissed(true);
          }}
        >
          Plus tard
        </button>
      </div>
    </Card>
  );
}
