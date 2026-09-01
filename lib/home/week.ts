/**
 * « Cette semaine » on the player home: what the person did since the week
 * opened. Pure — the service reads the rows (bounded by `gameWeek`), this
 * decides what shows and in which order.
 */
import { parisClock, parisDay, shiftDay } from "@/lib/time/paris";

export type WeekAction =
  /** A reading inscribed. */
  | { kind: "book"; at: Date; title: string; points: number }
  /** One of the player's readings placed on a bingo cell. */
  | { kind: "cell"; at: Date; label: string; title: string }
  /** A quest the player finished off for the team. */
  | { kind: "quest"; at: Date; number: number; title: string };

/** How many lines the card shows before it stops at the newest ones. */
export const MAX_WEEK_ACTIONS = 4;

/**
 * Same instant — one reading validated with its cell and its quest — the
 * result reads before its cause: « quête terminée », « case remplie », « lecture ».
 */
const RANK = { quest: 0, cell: 1, book: 2 } as const;

/** The newest actions of the week, most recent first. */
export function weekActions(actions: WeekAction[], max: number = MAX_WEEK_ACTIONS): WeekAction[] {
  return [...actions].sort((a, b) => b.at.getTime() - a.at.getTime() || RANK[a.kind] - RANK[b.kind]).slice(0, max);
}

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** When an action happened, in Paris days: « aujourd’hui », « hier », else the weekday. */
export function dayLabel(at: Date, now: Date): string {
  const day = parisDay(at);
  const today = parisDay(now);
  if (day === today) return "aujourd’hui";
  if (day === shiftDay(today, -1)) return "hier";
  return WEEKDAYS[parisClock(at).weekday];
}
