"use client";

import { useEffect, useState } from "react";
import { Kyle } from "@/components/ui/Kyle";
import { Confetti } from "@/components/Confetti";

const WIN = /ligne de bingo|grille terminée|validée ✅/;

/**
 * Action feedback: slides in, Kyle reacts (hop on success, shake on error), success
 * fades out by itself after 7 s, errors stay until closed. The query params are
 * cleaned from the URL so a refresh does not replay the message.
 */
export function Toast({ tone, text }: { tone: "ok" | "err"; text: string }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("ok") || url.searchParams.has("error")) {
        url.searchParams.delete("ok");
        url.searchParams.delete("error");
        window.history.replaceState(window.history.state, "", url.toString());
      }
    } catch {}
    if (tone !== "ok") return;
    const t = setTimeout(() => setShown(false), 7000);
    return () => clearTimeout(t);
  }, [tone]);
  if (!shown) return null;
  const win = tone === "ok" && WIN.test(text);
  return (
    <div className={`flash toast ${tone} ${win ? "win" : ""}`} role={tone === "err" ? "alert" : "status"}>
      <span className={`kyle-react ${tone === "ok" ? "hop" : "shake"}`} aria-hidden>
        <Kyle width={34} />
      </span>
      <span className="flex-1">{tone === "err" ? "⚠️ " : ""}{text}</span>
      <button type="button" onClick={() => setShown(false)} className="toast-x" aria-label="Fermer le message">
        ✕
      </button>
      {win && <Confetti />}
    </div>
  );
}
