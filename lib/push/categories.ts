/**
 * The three kinds of push notification, and how they read in Aide.
 *
 * Pure and Prisma-free on purpose: this list is imported by the browser bundle
 * (the switches) as much as by the service. The names match the `PushCategory`
 * enum of the schema one for one — `lib/services/push.ts` is where the two
 * meet, and TypeScript checks the pairing there.
 */

export const PUSH_CATEGORIES = ["STORY", "QUESTIONS", "ORGANIZER"] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number];

/** Narrows anything coming from a form, a query string or a client component. */
export function isPushCategory(x: unknown): x is PushCategory {
  return typeof x === "string" && (PUSH_CATEGORIES as readonly string[]).includes(x);
}

/** One row per switch: what it is called, and what it actually sends. */
export const PUSH_CATEGORY_LABELS: Record<PushCategory, { label: string; hint: string }> = {
  STORY: { label: "Histoire", hint: "votes ouverts et chapitres résolus pour ton équipe" },
  QUESTIONS: { label: "Mes questions", hint: "les réponses de l’organisation à tes questions" },
  ORGANIZER: { label: "Organisation", hint: "nouvelles questions, réponses des joueur·euses, choix à confirmer" },
};
