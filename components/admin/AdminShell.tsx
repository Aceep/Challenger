import type { ReactNode } from "react";
import { AdminRail } from "./AdminRail";

/** Desktop admin desk: 230 px rail + scrollable main. */
export function AdminShell({ who, base, children }: { who: string; base?: string; children: ReactNode }) {
  return (
    <div className="mx-auto my-0 grid min-h-dvh w-full max-w-[1280px] grid-cols-1 overflow-hidden border-[color:var(--line)] bg-[color:var(--bg)] md:my-6 md:min-h-[820px] md:grid-cols-[230px_1fr] md:rounded-[18px] md:border md:shadow-[var(--shadow)]">
      <AdminRail who={who} base={base} />
      <main className="flex flex-col gap-5 overflow-x-auto p-6">{children}</main>
    </div>
  );
}
