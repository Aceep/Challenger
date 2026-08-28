"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Submit button that shows a spinner and disables itself while its form is pending. */
export function SubmitButton({ children, className = "btn", pendingLabel, disabled }: { children: ReactNode; className?: string; pendingLabel?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending} className={className}>
      {pending && <span className="spinner" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
