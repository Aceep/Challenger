/**
 * Pure rules of a « fiche de lecture » in flight: how long it lives, and which
 * dropdown value it is allowed to accept.
 *
 * The row itself lives in `lib/services/pending-reading.ts`; everything here is
 * decidable without touching the database, so it is unit-tested. Keeping the
 * option check pure is what makes it cheap to be strict: the only ids that pass
 * are those frozen in the row's own snapshot, so a forged `custom_id` cannot
 * attach another team's quest.
 */
import { NONE } from "@/lib/discord/components";

/** One dropdown entry — exactly what `questChoices`/`cellChoices` return. */
export type PendingChoice = { name: string; value: string };
/** The frozen snapshot of both menus, taken once at MODAL_SUBMIT. */
export type PendingChoices = { quests: PendingChoice[]; cells: PendingChoice[] };
export type PendingField = "type" | "quest" | "cell";

/** A Discord interaction token dies after 15 min: past that the ephemeral can no longer be edited. */
export const PENDING_TTL_MS = 15 * 60_000;
/** Rows survive an hour past expiry, so a late click still reads « expirée » instead of « inconnue ». */
export const PENDING_GRACE_MS = 60 * 60_000;

/** When a form opened at `now` stops being usable. */
export const pendingExpiry = (now = new Date()): Date => new Date(now.getTime() + PENDING_TTL_MS);

export const isPendingExpired = (p: { expiresAt: Date }, now = new Date()): boolean => p.expiresAt.getTime() <= now.getTime();

/** Rows expired before this instant may be deleted by the tick. */
export const pendingPurgeCutoff = (now = new Date()): Date => new Date(now.getTime() - PENDING_GRACE_MS);

function readList(raw: unknown): PendingChoice[] {
  if (!Array.isArray(raw)) return [];
  const out: PendingChoice[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const { name, value } = c as { name?: unknown; value?: unknown };
    if (typeof name === "string" && typeof value === "string") out.push({ name, value });
  }
  return out;
}

/** The `options` Json column → the two menus, whatever noise the column holds. */
export function readPendingChoices(raw: unknown): PendingChoices {
  const o = raw && typeof raw === "object" ? (raw as { quests?: unknown; cells?: unknown }) : {};
  return { quests: readList(o.quests), cells: readList(o.cells) };
}

/** What one dropdown change writes on the row. */
export type PendingPatch = { type: "ROMAN" | "GRAPHIQUE" } | { questId: string | null } | { cellId: string | null };

/**
 * A selected value → the field to store, or `null` when the value was never
 * offered by this form. `NONE` (the « — aucune — » sentinel) clears the link.
 */
export function resolvePendingChoice(field: PendingField, value: string, choices: PendingChoices): PendingPatch | null {
  if (field === "type") return value === "ROMAN" || value === "GRAPHIQUE" ? { type: value } : null;
  if (value === NONE) return field === "quest" ? { questId: null } : { cellId: null };
  const offered = (field === "quest" ? choices.quests : choices.cells).some((c) => c.value === value);
  if (!offered) return null;
  return field === "quest" ? { questId: value } : { cellId: value };
}
