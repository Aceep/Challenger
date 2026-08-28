import { Skeleton, SkeletonCard, SkeletonLines, SkeletonPage } from "@/components/ui/Skeleton";

/**
 * Page-level skeletons. Each one mirrors the wrapper (`main` classes, gap) and the
 * block order of the real view so the transition to content does not jump — same
 * tiers (`card flat`, `sheet`), same radii tokens as the redesigned views.
 * Shared between the connected routes and their `/demo` mirrors.
 */

/** A `PageTitle`: the Fraunces h1 with its ink underline, optional kicker and right action. */
function TitleSkeleton({ w = "50%", kicker, action, className = "" }: { w?: string; kicker?: boolean; action?: number; className?: string }) {
  return (
    <header className={`flex flex-col gap-1 ${className}`} aria-hidden>
      {kicker && <Skeleton className="line w-2/5" />}
      <div className="page-title">
        <Skeleton className="title" style={{ width: w }} />
        {action ? <Skeleton className="h-9" style={{ width: action, borderRadius: "var(--r-md)" }} /> : null}
      </div>
    </header>
  );
}

/** A `.stat` tile: eyebrow, big Fraunces figure, hint. */
function StatSkeleton() {
  return (
    <div className="stat" aria-hidden>
      <Skeleton className="line w-3/5" />
      <Skeleton className="h-7 w-2/5" />
      <Skeleton className="line w-4/5" />
    </div>
  );
}

/** A `SectionHeading`: h2 plus its dotted leader. */
function SectionHeadingSkeleton({ w = "35%" }: { w?: string }) {
  return (
    <div className="section-heading" aria-hidden>
      <Skeleton className="h-5" style={{ width: w }} />
    </div>
  );
}

/** HomeView: greeting, score card, two stat tiles, big CTA, « Cette semaine » card. */
export function HomeSkeleton() {
  return (
    <SkeletonPage className="home" gap={6}>
      <TitleSkeleton className="page-head" w="50%" action={120} />
      <div className="score flex flex-col gap-3" aria-hidden>
        <div className="flex items-baseline justify-between gap-3">
          <Skeleton className="line w-1/3" />
          <Skeleton className="line w-1/4" />
        </div>
        <Skeleton className="h-14 w-2/5" />
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="line w-3/5" />
          <Skeleton className="h-8 w-24" style={{ borderRadius: "var(--r-md)" }} />
        </div>
      </div>
      <div className="stat2">
        <StatSkeleton />
        <StatSkeleton />
      </div>
      <Skeleton className="cta h-12 w-full" style={{ borderRadius: "var(--r-md)" }} />
      <SkeletonCard lines={3} />
    </SkeletonPage>
  );
}

/** One `card flat book` row: point plate, title, author, meta, footer. */
function BookRowSkeleton() {
  return (
    <li className="card flat book" aria-hidden>
      <Skeleton className="plate" style={{ borderRadius: 5 }} />
      <div className="body">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="line w-2/5" />
        <Skeleton className="line w-1/3" />
        <div className="foot">
          <Skeleton className="line w-2/5" />
        </div>
      </div>
    </li>
  );
}

/** BooksView: title + « Ajouter », my readings, then the team section. */
export function BooksSkeleton() {
  return (
    <SkeletonPage gap={6}>
      <TitleSkeleton w="45%" action={110} />
      <ul className="list" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <BookRowSkeleton key={i} />
        ))}
      </ul>
      <section className="section">
        <SectionHeadingSkeleton w="45%" />
        <ul className="list" aria-hidden>
          <BookRowSkeleton />
        </ul>
      </section>
    </SkeletonPage>
  );
}

/** QuestsView: title, quest cards (numbered head + pill + progress + meta). */
export function QuestsSkeleton() {
  return (
    <SkeletonPage gap={6}>
      <TitleSkeleton w="30%" />
      <ul className="list" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i}>
            <div className="card flat quest">
              <div className="head">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-6 w-20" style={{ borderRadius: "var(--r-md)" }} />
              </div>
              <Skeleton className="h-2 w-full" style={{ borderRadius: 999 }} />
              <SkeletonLines n={2} />
            </div>
          </li>
        ))}
      </ul>
    </SkeletonPage>
  );
}

/** TeamView: team name + summary line, stat tiles, members, ledger. */
export function TeamSkeleton() {
  return (
    <SkeletonPage gap={6}>
      <header className="flex flex-col gap-1" aria-hidden>
        <div className="page-title stack">
          <Skeleton className="title w-1/2" />
          <Skeleton className="line w-4/5" />
        </div>
      </header>
      <section className="stat2">
        {Array.from({ length: 4 }, (_, i) => (
          <StatSkeleton key={i} />
        ))}
      </section>
      <section className="section">
        <SectionHeadingSkeleton w="25%" />
        <ul className="list" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="card flat member">
              <Skeleton className="h-8 w-8 shrink-0" style={{ borderRadius: 999 }} />
              <div className="min-w-0 flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="line w-3/4" />
              </div>
              <Skeleton className="h-5 w-12" />
            </li>
          ))}
        </ul>
      </section>
    </SkeletonPage>
  );
}

/** HelpView: Kyle + title, the Discord card, then the rule cards. */
export function HelpSkeleton() {
  return (
    <SkeletonPage className="help" gap={6}>
      <div className="flex flex-col gap-3" aria-hidden>
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 shrink-0" style={{ borderRadius: 999 }} />
          <Skeleton className="title min-w-0 flex-1" />
        </div>
        <Skeleton className="line w-4/5" />
      </div>
      <Skeleton className="h-9 w-52" style={{ borderRadius: "var(--r-md)" }} />
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </SkeletonPage>
  );
}

/** LeaderboardView: kicker + title, ranked rows (medal · name/sub · points). */
export function LeaderboardSkeleton() {
  return (
    <SkeletonPage gap={4}>
      <TitleSkeleton w="45%" kicker />
      <ol className="list" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="card flat rank">
            <Skeleton className="h-7 w-[30px] shrink-0" style={{ borderRadius: 999 }} />
            <div className="min-w-0 flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="line w-3/4" />
            </div>
            <Skeleton className="h-6 w-14" />
          </li>
        ))}
      </ol>
      <Skeleton className="line w-2/3" />
    </SkeletonPage>
  );
}

/** StoryView: kicker + chapter title, the chapter card, three choices. */
export function StorySkeleton() {
  return (
    <SkeletonPage className="story">
      <TitleSkeleton w="70%" kicker />
      <div className="card px-5 py-4.5" aria-hidden>
        <SkeletonLines n={6} />
      </div>
      <div className="flex flex-col gap-2" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" style={{ borderRadius: "var(--r-md)" }} />
        ))}
      </div>
    </SkeletonPage>
  );
}

/** BingoView: title + progress line, the 5×5 grid, legend, and the desktop side sheet slot. */
export function BingoSkeleton() {
  return (
    <SkeletonPage>
      <section className="bingo-layout flex flex-col gap-4" aria-hidden>
        <TitleSkeleton w="50%" kicker />
        <div className="bingo-grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
          {Array.from({ length: 25 }, (_, i) => (
            <Skeleton key={i} style={{ minHeight: 92, borderRadius: "var(--r-sm)" }} />
          ))}
        </div>
        <Skeleton className="line w-1/2" />
        <div className="sheet flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="line w-1/2" />
          <Skeleton className="h-9 w-full" style={{ borderRadius: "var(--r-sm)" }} />
        </div>
      </section>
    </SkeletonPage>
  );
}

/** FaqListView: title + « Poser une question », pinned answers, then the question cards. */
export function FaqListSkeleton() {
  return (
    <SkeletonPage gap={5}>
      <TitleSkeleton w="25%" action={180} />
      <section className="flex flex-col gap-2.5">
        <Skeleton className="line w-40" />
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
        <Skeleton className="line w-32" />
        <ul className="list" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <div className="card quest">
                <div className="head">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-16" style={{ borderRadius: 999 }} />
                </div>
                <Skeleton className="line w-2/5" />
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
    <SkeletonPage gap={5}>
      <TitleSkeleton w="70%" kicker />
      <div className="card" aria-hidden>
        <SkeletonLines n={3} />
      </div>
      <Skeleton className="line w-24" />
      <ul className="list" aria-hidden>
        {Array.from({ length: 2 }, (_, i) => (
          <li key={i} className="card flat flex flex-col gap-2">
            <Skeleton className="line w-1/3" />
            <SkeletonLines n={2} />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5" aria-hidden>
        <Skeleton className="line w-20" />
        <Skeleton className="h-20 w-full" style={{ borderRadius: "var(--r-sm)" }} />
      </div>
      <Skeleton className="h-12 w-full" style={{ borderRadius: "var(--r-md)" }} />
    </SkeletonPage>
  );
}

/** BookForm page: title, seven labelled fields, primary button, cancel link. */
export function BookFormSkeleton() {
  const widths = ["100%", "100%", "40%", "100%", "100%", "100%", "45%"];
  return (
    <SkeletonPage>
      <TitleSkeleton w="60%" />
      <div className="flex flex-col gap-4" aria-hidden>
        {widths.map((w, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="line w-1/3" />
            <Skeleton className="h-11" style={{ width: w, borderRadius: "var(--r-sm)" }} />
          </div>
        ))}
        <Skeleton className="h-12 w-full" style={{ borderRadius: "var(--r-md)" }} />
        <Skeleton className="h-11 w-full" style={{ borderRadius: "var(--r-md)" }} />
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
          <Skeleton key={i} className="line flex-1" />
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
            <Skeleton className="line w-4/5" />
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
            <Skeleton className="line w-1/3" />
            <Skeleton className="h-10 w-full" style={{ borderRadius: "var(--r-sm)" }} />
          </div>
        ))}
      </div>
      <TableSkeleton rows={6} cols={6} />
    </AdminFrame>
  );
}
