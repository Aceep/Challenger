import { Skeleton, SkeletonCard, SkeletonLines, SkeletonPage } from "@/components/ui/Skeleton";

/**
 * Page-level skeletons. Each one mirrors the wrapper (`main` classes, gap) and the
 * block order of the real view so the transition to content does not jump.
 * Shared between the connected routes and their `/demo` mirrors.
 */

/** HomeView: greeting line, score card, two stat tiles, big CTA, "Cette semaine" card. */
export function HomeSkeleton() {
  return (
    <SkeletonPage className="home">
      <div className="flex items-baseline justify-between gap-3">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="score flex flex-col gap-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-14 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <div className="stat2">
        <SkeletonCard lines={1} />
        <SkeletonCard lines={1} />
      </div>
      <Skeleton className="h-12 w-full" style={{ borderRadius: 12 }} />
      <SkeletonCard lines={3} />
    </SkeletonPage>
  );
}

/** BooksView: title + "Ajouter" button, reading cards (cover + centered body), team eyebrow. */
export function BooksSkeleton() {
  return (
    <SkeletonPage>
      <header className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-9 w-24" style={{ borderRadius: 999 }} />
      </header>
      <ul className="list" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i}>
            <div className="card book">
              <Skeleton className="cover" />
              <div className="body">
                <div className="head">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-3 w-4/5" />
                <div className="foot">
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Skeleton className="h-3 w-2/5" />
      <SkeletonCard lines={1} />
    </SkeletonPage>
  );
}

/** QuestsView: title, quest cards (numbered head + text + progress). */
export function QuestsSkeleton() {
  return (
    <SkeletonPage gap={5}>
      <Skeleton className="h-7 w-1/3" />
      <ul className="list" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i}>
            <div className="card quest">
              <div className="head">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-12" style={{ borderRadius: 999 }} />
              </div>
              <SkeletonLines n={2} />
              <Skeleton className="h-2 w-full" style={{ borderRadius: 999 }} />
            </div>
          </li>
        ))}
      </ul>
    </SkeletonPage>
  );
}

/** TeamView: back link, team name, summary line, four stat tiles, members list. */
export function TeamSkeleton() {
  return (
    <SkeletonPage gap={5}>
      <header className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </header>
      <section className="stat2">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </section>
      <section className="flex flex-col gap-2.5">
        <Skeleton className="h-3 w-20" />
        <ul className="list" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <div className="card member">
                <Skeleton className="h-9 w-9 shrink-0" style={{ borderRadius: 999 }} />
                <span className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </span>
                <Skeleton className="h-5 w-12" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </SkeletonPage>
  );
}

/** HelpView: Kyle + back link/title/subtitle, then rule cards. */
export function HelpSkeleton() {
  return (
    <SkeletonPage className="help">
      <header className="flex items-center gap-3">
        <Skeleton className="h-16 w-16 shrink-0" style={{ borderRadius: 999 }} />
        <span className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-3 w-3/5" />
        </span>
      </header>
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </SkeletonPage>
  );
}

/** LeaderboardView: title + subline, ranked rows (position · name/sub · points). */
export function LeaderboardSkeleton() {
  return (
    <SkeletonPage gap={3}>
      <header className="flex flex-col gap-2">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-3 w-3/5" />
      </header>
      <ol className="list" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i}>
            <div className="card rank">
              <Skeleton className="h-7 w-[30px] shrink-0" />
              <span className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </span>
              <Skeleton className="h-6 w-14" />
            </div>
          </li>
        ))}
      </ol>
      <Skeleton className="h-3 w-2/3" />
    </SkeletonPage>
  );
}

/** StoryView: eyebrow + chapter title, chapter card, three choice buttons. */
export function StorySkeleton() {
  return (
    <SkeletonPage className="story" gap={5}>
      <header className="flex flex-col gap-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-7 w-3/4" />
      </header>
      <div className="chapter card">
        <SkeletonLines n={6} />
      </div>
      <div className="flex flex-col gap-2" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="choice">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}

/** BingoView: title + progress line, grid (5×5) inside `.bingo-layout` so the desktop side sheet slot is reserved. */
export function BingoSkeleton() {
  return (
    <SkeletonPage gap={5}>
      <section className="bingo-layout flex flex-col gap-3" aria-hidden>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="bingo-grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
          {Array.from({ length: 25 }, (_, i) => (
            <Skeleton key={i} className="cell" />
          ))}
        </div>
        <Skeleton className="h-3 w-1/2" />
        <div className="sheet flex flex-col gap-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </section>
    </SkeletonPage>
  );
}

/** FaqListView: title + "Poser une question", pinned answers, then the question cards. */
export function FaqListSkeleton() {
  return (
    <SkeletonPage gap={5}>
      <header className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-1/4" />
        <Skeleton className="h-9 w-44" style={{ borderRadius: 999 }} />
      </header>
      <section className="flex flex-col gap-2.5">
        <Skeleton className="h-3 w-40" />
        <ul className="list" aria-hidden>
          {Array.from({ length: 2 }, (_, i) => (
            <li key={i}>
              <div className="card quest">
                <div className="head">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-5 w-16" style={{ borderRadius: 999 }} />
                </div>
                <SkeletonLines n={2} />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2.5">
        <Skeleton className="h-3 w-32" />
        <ul className="list" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <div className="card quest">
                <div className="head">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-16" style={{ borderRadius: 999 }} />
                </div>
                <Skeleton className="h-3 w-2/5" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </SkeletonPage>
  );
}

/** QuestionView: back link + title, the question, its replies, the answer form. */
export function QuestionSkeleton() {
  return (
    <SkeletonPage>
      <header className="flex flex-col gap-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-3 w-2/5" />
      </header>
      <div className="chapter card">
        <SkeletonLines n={3} />
      </div>
      <Skeleton className="h-3 w-24" />
      <ul className="list" aria-hidden>
        {Array.from({ length: 2 }, (_, i) => (
          <li key={i}>
            <div className="card flex flex-col gap-2">
              <Skeleton className="h-3 w-1/3" />
              <SkeletonLines n={2} />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5" aria-hidden>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-20 w-full" style={{ borderRadius: 10 }} />
      </div>
      <Skeleton className="h-12 w-full" style={{ borderRadius: 12 }} />
    </SkeletonPage>
  );
}

/** BookForm page: title, seven labelled fields, primary button, cancel link. */
export function BookFormSkeleton() {
  const widths = ["100%", "100%", "40%", "100%", "100%", "100%", "45%"];
  return (
    <SkeletonPage>
      <Skeleton className="h-7 w-3/5" />
      <div className="flex flex-col gap-4" aria-hidden>
        {widths.map((w, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-11" style={{ width: w, borderRadius: 10 }} />
          </div>
        ))}
        <Skeleton className="h-12 w-full" style={{ borderRadius: 12 }} />
        <Skeleton className="mx-auto h-3 w-16" />
      </div>
    </SkeletonPage>
  );
}

/* ---------- Admin (rendered inside AdminShell's <main>, which owns the gap) ---------- */

function AdminFrame({ children, badge }: { children: React.ReactNode; badge?: boolean }) {
  return (
    <div className="contents" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="topline">
        <Skeleton className="h-8 w-1/3" />
        {badge && <Skeleton className="h-6 w-40" style={{ borderRadius: 999 }} />}
      </div>
      {children}
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card flex flex-col gap-0" aria-hidden>
      <div className="flex gap-4 border-b border-[color:var(--line)] px-3.5 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-[color:var(--line)] px-3.5 py-3.5 last:border-b-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-4 flex-1" style={{ maxWidth: c === 0 ? "40%" : undefined }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** DashboardView: topline with edition badge, four KPIs, two tables. */
export function AdminDashboardSkeleton() {
  return (
    <AdminFrame badge>
      <div className="kpis">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card kpi flex flex-col gap-2" aria-hidden>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={3} cols={3} />
      <TableSkeleton rows={5} cols={4} />
    </AdminFrame>
  );
}

/** Generic admin list page (Équipes, Joueurs, Quêtes, Bingo, Histoire, Défi): title, table, optional secondary card. */
export function AdminTableSkeleton({ rows = 5, cols = 4, secondary = false }: { rows?: number; cols?: number; secondary?: boolean }) {
  return (
    <AdminFrame>
      <TableSkeleton rows={rows} cols={cols} />
      {secondary && <SkeletonCard lines={3} />}
    </AdminFrame>
  );
}

/** FaqAdminView: title, the Discord forum card, then the questions table. */
export function AdminFaqSkeleton() {
  return (
    <AdminFrame badge>
      <SkeletonCard lines={3} />
      <TableSkeleton rows={5} cols={5} />
    </AdminFrame>
  );
}

/** ReadingsView: title, filter form (form-grid), table. */
export function AdminReadingsSkeleton() {
  return (
    <AdminFrame>
      <div className="card form-grid" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-10 w-full" style={{ borderRadius: 10 }} />
          </div>
        ))}
      </div>
      <TableSkeleton rows={6} cols={6} />
    </AdminFrame>
  );
}
