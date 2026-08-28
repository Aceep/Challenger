import type { CSSProperties, ReactNode } from "react";
import type { EditionOption } from "@/components/EditionSwitcher";
import { AdminRail } from "./AdminRail";

export type AdminShellProps = {
  /** Who is at the desk — just their name, the edition has its own block. */
  who: string;
  /** The edition being administrated: its colour paints `--edition` for the whole desk. */
  edition: { id: string; name: string; color: string };
  /** Every edition this person may switch to, including the current one. */
  editions: EditionOption[];
  switchAction: (formData: FormData) => Promise<void>;
  base?: string;
  openQuestions?: number;
  children: ReactNode;
};

/** Admin: full-page layout — sticky 232 px rail on the left, content centered in the rest. */
export function AdminShell({ who, edition, editions, switchAction, base, openQuestions, children }: AdminShellProps) {
  return (
    <div
      className="grid min-h-dvh w-full grid-cols-1 bg-[color:var(--bg)] md:grid-cols-[232px_minmax(0,1fr)]"
      style={{ "--edition": edition.color } as CSSProperties}
    >
      <AdminRail who={who} edition={edition} editions={editions} switchAction={switchAction} base={base} openQuestions={openQuestions} />
      <div className="min-w-0">
        <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 overflow-x-auto p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
