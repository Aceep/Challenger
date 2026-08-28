import Link from "next/link";
import { CountUp } from "@/components/ui/CountUp";
import type { ComponentProps, ReactNode } from "react";
import { fmtDelta, fmtPoints } from "@/lib/format";
import { ArrowRightIcon, CheckIcon, Medal } from "./icons";
import { Kyle } from "./Kyle";

export { Kyle, Medal };

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type Variant = "primary" | "ghost" | "danger";
const variantClass: Record<Variant, string> = { primary: "", ghost: "ghost", danger: "danger" };

/** Primary / ghost / danger button in three sizes. Renders an `<a>` when `href` is given. */
export function Button({
  variant = "primary",
  size = "md",
  small,
  className,
  href,
  ...props
}: {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  /** Kept for the admin screens, same thing as `size="sm"`. */
  small?: boolean;
  href?: string;
} & Omit<ComponentProps<"button">, "ref">) {
  const scale = small || size === "sm" ? "sm" : size === "lg" ? "lg" : "";
  const cls = cx("btn", variantClass[variant], scale, className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {props.children}
      </Link>
    );
  }
  return <button {...props} className={cls} />;
}

/**
 * `card` is a panel, `flat` a row on the paper, `raised` a sheet lifted a
 * little, `sheet` the yellow-edged working panel. `interactive` adds the hover
 * lift — only for something the whole of which is clickable.
 */
export function Card({
  tier = "card",
  interactive,
  className,
  children,
  style,
  as: As = "div",
}: {
  tier?: "card" | "flat" | "raised" | "sheet";
  interactive?: boolean;
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
  as?: "div" | "section" | "li" | "article";
}) {
  const base = tier === "sheet" ? "sheet" : cx("card", tier !== "card" && tier);
  return (
    <As className={cx(base, interactive && "is-interactive", className)} style={style}>
      {children}
    </As>
  );
}

export function Eyebrow({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={cx("eyebrow", className)} style={style}>
      {children}
    </p>
  );
}

/** Secondary line: 13 px muted. `row` joins its `<span>` children with `·`. */
export function Meta({
  children,
  row,
  xs,
  className,
  style,
}: {
  children: ReactNode;
  row?: boolean;
  xs?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <p className={cx(xs ? "meta-xs" : "meta", row && "row", className)} style={style}>
      {children}
    </p>
  );
}

/** Page heading: h1 with the ink underline, an optional kicker and a right action. */
export function PageTitle({
  children,
  kicker,
  action,
  stack,
  style,
  className,
}: {
  children: ReactNode;
  /** Rendered above the title (eyebrow, team name…). */
  kicker?: ReactNode;
  /** Rendered on the right of the title (a button, a link). */
  action?: ReactNode;
  /** Puts the action under the title instead of beside it. */
  stack?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <header className={cx("flex flex-col gap-1", className)}>
      {kicker}
      <div className={cx("page-title", stack && "stack")}>
        <h1 style={style}>{children}</h1>
        {action}
      </div>
    </header>
  );
}

/** Section heading: Fraunces h2 followed by a dotted leader, optional action. */
export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      {action ? <span className="act">{action}</span> : null}
    </div>
  );
}

export type PillTone = "ok" | "wait" | "no" | "type" | "me";

/**
 * A soft pastille for a classification; `stamp` turns it into the inked state
 * mark (validée, en attente ½, ex æquo, Ton vote…).
 */
export function Pill({
  tone = "type",
  stamp,
  xs,
  children,
  className,
}: {
  tone?: PillTone;
  stamp?: boolean;
  xs?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx(stamp ? "stamp" : "pill", tone, stamp && xs && "xs", className)}>{children}</span>;
}

/** Team (or edition) avatar: first letter over the team colour. */
export function Avatar({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ background: color, width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden>
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

/** Label + control + hint, matching the prototype's `.field`. */
export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("field", className)}>
      {label}
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

/** Small figure tile (2-up on mobile): flat, Fraunces 700. */
export function Stat({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "brick" | "olive" }) {
  return (
    <div className="stat">
      <p className="eyebrow">{label}</p>
      <p className="v num" style={tone ? { color: `var(--${tone}-ink)` } : undefined}>
        {value}
      </p>
      {hint ? <p className="meta-xs">{hint}</p> : null}
    </div>
  );
}

/** Team score card: edition eyebrow, big Fraunces value, rank line. */
export function ScoreCard({
  teamName,
  teamColor,
  challengeName,
  points,
  rankLine,
  href = "/team",
  linkLabel = "Équipe",
}: {
  teamName: string;
  teamColor: string;
  challengeName: string;
  points: number;
  rankLine?: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <section className="score" style={{ borderTopColor: teamColor }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow" style={{ color: teamColor }}>
          {teamName}
        </span>
        <span className="accent">{challengeName}</span>
      </div>
      <p className="value num">
        <CountUp value={points} />
        <small className="accent">pts</small>
      </p>
      <div className="flex items-center justify-between gap-3">
        {rankLine ? <Meta>{rankLine}</Meta> : <span />}
        <Link href={href} className="btn sm ghost">
          {linkLabel} <ArrowRightIcon />
        </Link>
      </div>
    </section>
  );
}

/** Olive when complete, yellow when a half is pending. */
export function ProgressBar({ ratio, half }: { ratio: number; half?: boolean }) {
  return (
    <div className={cx("bar", half && "half")}>
      <i style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }} />
    </div>
  );
}

/** Dashed box with Kyle: nothing here yet. */
export function KyleEmpty({ children, action }: { children: ReactNode; card?: boolean; action?: ReactNode }) {
  return (
    <div className="kyle-empty">
      <Kyle width={54} />
      <span className="copy">
        <span>{children}</span>
        {action}
      </span>
    </div>
  );
}

export function RankRow({
  rank,
  medal,
  name,
  sub,
  points,
  color,
  me,
  tie,
}: {
  /** Position, drawn as a medal for the podium. */
  rank?: number;
  /** Legacy slot, still accepted by the demo pages. */
  medal?: ReactNode;
  name: string;
  sub: ReactNode;
  points: number;
  color: string;
  me?: boolean;
  tie?: boolean;
}) {
  return (
    <li className={cx("card flat rank", me && "me")} style={{ borderLeftColor: color }}>
      {typeof rank === "number" ? <Medal rank={rank} /> : <span className="pos">{medal}</span>}
      <div className="min-w-0">
        <p className="nm">
          <span className="truncate">{name}</span>
          {me ? (
            <Pill stamp tone="me">
              vous
            </Pill>
          ) : null}
          {tie ? (
            <Pill stamp tone="type">
              ex æquo
            </Pill>
          ) : null}
        </p>
        <p className="sub">{sub}</p>
      </div>
      <p className="pts num">{fmtPoints(points)}</p>
    </li>
  );
}

export function MemberRow({
  name,
  sub,
  points,
  color,
  badge,
  badgeIcon,
}: {
  name: string;
  sub: ReactNode;
  points: number;
  color: string;
  /** « capitaine » / « adjointe »… */
  badge?: string;
  badgeIcon?: ReactNode;
}) {
  return (
    <li className="card flat member">
      <Avatar name={name} color={color} size={32} />
      <div className="min-w-0">
        <p className="nm">
          <span className="truncate">{name}</span>
          {badge ? (
            <Pill tone="type">
              {badgeIcon}
              {badge}
            </Pill>
          ) : null}
        </p>
        <p className="sub">{sub}</p>
      </div>
      <p className="pts num">{fmtPoints(points)}</p>
    </li>
  );
}

/** Append-only point events, + in olive ink, − in brick ink, on dotted rules. */
export function Ledger({ entries }: { entries: { id: string; label: ReactNode; amount: number }[] }) {
  return (
    <div className="ledger card flat">
      {entries.map((e) => (
        <div key={e.id}>
          <span className="min-w-0 truncate">{e.label}</span>
          <span className={cx("num", e.amount < 0 ? "minus" : "plus")}>{fmtDelta(e.amount)}</span>
        </div>
      ))}
    </div>
  );
}

/** One bingo square: olive when validated, yellow hatching when a half is pending. */
export function BingoCell({
  label,
  prompt,
  note,
  state,
  selected,
  pop,
  onClick,
}: {
  label: string;
  prompt: string;
  note?: ReactNode;
  state: "done" | "half" | "free";
  selected?: boolean;
  /** Plays the validation animation once (cell just completed). */
  pop?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} — ${prompt}`}
      className={cx("cell", state === "done" && "done", state === "half" && "half", selected && "sel", pop && "pop")}
    >
      <span className="k" aria-hidden="true">
        {label}
      </span>
      <span className="p">{prompt}</span>
      {note ? <span className="n">{note}</span> : null}
      {state === "done" ? <span className="sr-only">validée</span> : null}
    </button>
  );
}

/** Small olive check, for « terminée » lines. */
export function DoneMark() {
  return <CheckIcon className="text-[color:var(--olive-ink)]" />;
}
