import { z } from "zod";

/**
 * Effects attached to a story choice, applied when the team's vote resolves.
 * `target: "self"` = the voting team; `"chosen"` = a rival team picked by the
 * captain after the vote; `"others"` = every other team of the challenge.
 */
const target = z.enum(["self", "chosen", "others"]).default("self");

export const effectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("points"), target, amount: z.number().int() }),
  z.object({
    type: z.literal("steal"),
    /** Points taken from the chosen team and given to self. */
    amount: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("modifier"),
    target,
    multiplier: z.number().positive().max(5),
    days: z.number().positive().max(60),
    label: z.string().max(80).optional(),
  }),
  z.object({
    type: z.literal("quest"),
    target,
    title: z.string().min(1).max(120),
    description: z.string().max(2000).default(""),
    points: z.number().int().min(0),
    days: z.number().positive().max(60).optional(),
  }),
  z.object({ type: z.literal("alliance") }),
]);
export type Effect = z.infer<typeof effectSchema>;

export const effectsSchema = z.array(effectSchema);

export function parseEffects(json: unknown): Effect[] {
  const r = effectsSchema.safeParse(json);
  return r.success ? r.data : [];
}

/** True when at least one effect needs the captain to pick a rival team. */
export function needsTargetTeam(effects: Effect[]): boolean {
  return effects.some(
    (e) => e.type === "steal" || e.type === "alliance" || ("target" in e && e.target === "chosen"),
  );
}

/** Human summary (French) for Discord/app messages. */
export function describeEffect(e: Effect, names: { self: string; chosen?: string }): string {
  const who = (t: "self" | "chosen" | "others") =>
    t === "self" ? names.self : t === "chosen" ? (names.chosen ?? "l'équipe visée") : "toutes les autres équipes";
  switch (e.type) {
    case "points":
      return `${e.amount >= 0 ? "+" : ""}${e.amount} pts pour ${who(e.target)}`;
    case "steal":
      return `${names.self} vole ${e.amount} pts à ${names.chosen ?? "l'équipe visée"}`;
    case "modifier":
      return `${who(e.target)} : points ×${e.multiplier} pendant ${e.days} jour${e.days > 1 ? "s" : ""}`;
    case "quest":
      return `nouvelle quête « ${e.title} » (${e.points} pts) pour ${who(e.target)}`;
    case "alliance":
      return `alliance entre ${names.self} et ${names.chosen ?? "l'équipe choisie"}`;
  }
}

export const EFFECT_EXAMPLES = `[
  { "type": "points", "target": "self", "amount": 30 },
  { "type": "steal", "amount": 50 },
  { "type": "modifier", "target": "chosen", "multiplier": 0.8, "days": 3, "label": "Malédiction" },
  { "type": "quest", "target": "chosen", "title": "Lire un classique", "points": 40, "days": 7 },
  { "type": "alliance" }
]`;
