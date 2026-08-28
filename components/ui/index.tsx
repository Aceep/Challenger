import Link from "next/link";
import { CountUp } from "@/components/ui/CountUp";
import type { ComponentProps, ReactNode } from "react";
import { fmtDelta, fmtPoints } from "@/lib/format";
import { Kyle } from "./Kyle";

export { Kyle };

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type Variant = "primary" | "ghost" | "danger";
const variantClass: Record<Variant, string> = { primary: "", ghost: "ghost", danger: "danger" };

/** Primary / ghost / danger button, optionally small. Renders an <a> when `href` is given. */
export function Button({
  variant = "primary",
  small,
  className,
  href,
  ...props
}: { variant?: Variant; small?: boolean; href?: string } & Omit<ComponentProps<"button">, "ref">) {
  const cls = cx("btn", variantClass[variant], small && "small", className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {props.children}
      </Link>
    );
  }
  return <button {...props} className={cls} />;
}

/** Extra props are forwarded to the `<div>` (used for `data-tour` targets). */
export function Card({ className, children, style, ...rest }: { className?: string; children: ReactNode } & Omit<ComponentProps<"div">, "ref" | "className" | "children">) {
  return (
    <div {...rest} className={cx("card", className)} style={style}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={cx("eyebrow", className)} style={style}>
      {children}
    </p>
  );
}

export type PillTone = "ok" | "wait" | "no" | "type";

export function Pill({ tone = "type", children, className }: { tone?: PillTone; children: ReactNode; className?: string }) {
  return <span className={cx("pill", tone, className)}>{children}</span>;
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

/** Small figure card (2-up on mobile). */
export function Stat({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "brick" | "olive" }) {
  return (
    <div className="card">
      <p className="eyebrow">{label}</p>
      <p className="v num" style={tone ? { color: `var(--${tone})` } : undefined}>
        {value}
      </p>
      {hint ? <p className="text-xs text-[color:var(--muted)]">{hint}</p> : null}
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
  linkLabel = "Équipe →",
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
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow" style={{ color: teamColor }}>
          {teamName} · {challengeName}
        </span>
        <Link href={href} className="text-xs text-[color:var(--muted)]">
          {linkLabel}
        </Link>
      </div>
      <p className="value num">
        <CountUp value={points} />
        <small>pts</small>
      </p>
      {rankLine ? <p className="text-[13px] text-[color:var(--muted)]">{rankLine}</p> : null}
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

export function KyleEmpty({ children, card = true }: { children: ReactNode; card?: boolean }) {
  return (
    <div className={cx("kyle-empty", card && "card")}>
      <Kyle width={54} />
      <span>{children}</span>
    </div>
  );
}

export function RankRow({
  medal,
  name,
  sub,
  points,
  color,
  me,
  tie,
}: {
  medal: ReactNode;
  name: string;
  sub: ReactNode;
  points: number;
  color: string;
  me?: boolean;
  tie?: boolean;
}) {
  return (
    <li className={cx("card rank", me && "me")} style={{ borderLeftColor: color }}>
      <span className="pos" aria-hidden={typeof medal === "string" && medal.length > 1}>
        {medal}
      </span>
      <div className="min-w-0">
        <p className="nm truncate">
          {name} {tie ? <Pill tone="type">ex æquo</Pill> : null}
        </p>
        <p className="sub">{sub}</p>
      </div>
      <p className="pts num">{fmtPoints(points)}</p>
    </li>
  );
}

export function MemberRow({ name, sub, points, color, badge }: { name: string; sub: ReactNode; points: number; color: string; badge?: string }) {
  return (
    <li className="card member">
      <Avatar name={name} color={color} />
      <div className="min-w-0">
        <p className="nm truncate">
          {badge ? `${badge} ` : ""}
          {name}
        </p>
        <p className="sub">{sub}</p>
      </div>
      <p className="pts num">{fmtPoints(points)}</p>
    </li>
  );
}

/** Append-only point events, + in olive, − in brick. */
export function Ledger({ entries }: { entries: { id: string; label: ReactNode; amount: number }[] }) {
  return (
    <div className="ledger card">
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
      <span className="k" aria-hidden="true">{label}</span>
      <span className="p">{prompt}</span>
      {note ? <span className="n">{note}</span> : null}
    </button>
  );
}
