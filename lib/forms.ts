import type { ZodType } from "zod";

export type ActionState = { error?: string; success?: string } | null;

/** Parses FormData with a zod schema; returns a French error message on failure. */
export function parseForm<T>(schema: ZodType<T>, formData: FormData): { data: T } | { error: string } {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of formData.entries()) raw[k] = v;
  const result = schema.safeParse(raw);
  if (result.success) return { data: result.data };
  const first = result.error.issues[0];
  return { error: first ? `${first.path.join(".") ? first.path.join(".") + " : " : ""}${first.message}` : "Formulaire invalide" };
}
