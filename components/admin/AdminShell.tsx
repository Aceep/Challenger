import type { ReactNode } from "react";
import { AdminRail } from "./AdminRail";

/** Admin: full-page layout — sticky 232 px rail on the left, content centered in the rest. */
export function AdminShell({ who, base, openQuestions, children }: { who: string; base?: string; openQuestions?: number; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh w-full grid-cols-1 bg-[color:var(--bg)] md:grid-cols-[232px_minmax(0,1fr)]">
      <AdminRail who={who} base={base} openQuestions={openQuestions} />
      <div className="min-w-0">
        <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 overflow-x-auto p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
