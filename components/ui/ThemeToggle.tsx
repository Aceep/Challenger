"use client";

import { useSyncExternalStore } from "react";

type Theme = "auto" | "light" | "dark";
const OPTIONS: { value: Theme; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "☀️ Clair" },
  { value: "dark", label: "🌙 Sombre" },
];

// The <html data-theme> attribute is the source of truth: the anti-flash script
// in app/layout.tsx sets it from localStorage before the first paint.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" || attr === "dark" ? attr : "auto";
}

function write(value: Theme) {
  const root = document.documentElement;
  if (value === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", value);
  try {
    localStorage.setItem("ak-theme", value);
  } catch {
    /* navigation privée : le choix ne survit pas à la session */
  }
  for (const listener of listeners) listener();
}

/** Auto / Clair / Sombre, stored in localStorage (`ak-theme`). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore<Theme>(subscribe, read, () => "auto");

  return (
    <div
      role="group"
      aria-label="Thème"
      className={`inline-flex rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] p-[3px] ${className}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          onClick={() => write(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold ${
            theme === o.value ? "bg-[color:var(--btn)] text-[color:var(--btn-ink)]" : "text-[color:var(--muted)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
