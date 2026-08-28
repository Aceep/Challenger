/**
 * Europe/Paris clock helpers (DST-safe via Intl). Pure, no I/O.
 * - Verification window: Sunday 19:00–21:00 (writes refused for non-admins).
 * - Night pause: 00:00–08:00 (story tie-break timers frozen).
 */

export const TZ = "Europe/Paris";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
});

export type ParisClock = { weekday: number; hour: number; minute: number };

/** Local Paris weekday (0 = Sunday), hour and minute of an instant. */
export function parisClock(date: Date): ParisClock {
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { weekday, hour: Number(parts.hour) % 24, minute: Number(parts.minute) };
}

export const WINDOW_START_HOUR = 19;
export const WINDOW_END_HOUR = 21;

/** Sunday 19:00 ≤ t < 21:00 Paris time. */
export function isVerificationWindow(date: Date): boolean {
  const { weekday, hour } = parisClock(date);
  return weekday === 0 && hour >= WINDOW_START_HOUR && hour < WINDOW_END_HOUR;
}

export const NIGHT_START_HOUR = 0;
export const NIGHT_END_HOUR = 8;

/** 00:00 ≤ t < 08:00 Paris time. */
export function isNightPause(date: Date): boolean {
  const { hour } = parisClock(date);
  return hour >= NIGHT_START_HOUR && hour < NIGHT_END_HOUR;
}

const MINUTE = 60_000;

/**
 * Milliseconds of [from, to) that fall inside `paused` periods, sampled per minute.
 * Minute sampling is exact here because every boundary sits on a whole minute.
 */
export function pausedMs(from: Date, to: Date, paused: (d: Date) => boolean): number {
  let ms = 0;
  const start = Math.floor(from.getTime() / MINUTE) * MINUTE;
  for (let t = start; t < to.getTime(); t += MINUTE) {
    if (paused(new Date(t))) ms += Math.min(MINUTE, to.getTime() - Math.max(t, from.getTime()));
  }
  return ms;
}

/** `from` + `hours` of active time, skipping periods where `paused` is true. */
export function addActiveTime(from: Date, activeMs: number, paused: (d: Date) => boolean): Date {
  let remaining = activeMs;
  let t = from.getTime();
  // Walk minute by minute; bounded by activeMs + pauses (≤ a few days).
  while (remaining > 0) {
    if (!paused(new Date(t))) {
      const step = Math.min(MINUTE - (t % MINUTE), remaining);
      remaining -= step;
      t += step;
    } else {
      t = Math.floor(t / MINUTE) * MINUTE + MINUTE;
    }
  }
  return new Date(t);
}

/** `from` + `hours` of active time, frozen during the night pause. */
export function addActiveHours(from: Date, hours: number): Date {
  return addActiveTime(from, hours * 3_600_000, isNightPause);
}

/** Next Sunday 20:00 Paris on or after `date` (used by the weekly leaderboard post). */
export function sundayKey(date: Date): string {
  // ISO date (Paris) of the Sunday of the week containing `date` (weeks Mon–Sun).
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const { weekday } = parisClock(date);
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((7 - weekday) % 7));
  return d.toISOString().slice(0, 10);
}
