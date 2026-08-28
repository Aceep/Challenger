/**
 * Error → user message mapping shared by Server Actions and the Discord endpoint.
 * Rule errors (GameError, thrown by services with French text) are shown verbatim;
 * anything else is logged with a short reference and replaced by a generic message.
 */

/** An expected, user-facing error (rule refused, not found, permission). */
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameError";
  }
}

const PRISMA: Record<string, string> = {
  P2002: "Cette valeur existe déjà.",
  P2003: "Impossible : d'autres données en dépendent encore.",
  P2025: "Introuvable (déjà supprimé ?).",
};

export const GENERIC_ERROR = "Une erreur est survenue, réessaie dans un instant.";

export function userMessage(e: unknown): string {
  if (e instanceof GameError) return e.message;
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  if (code in PRISMA) return PRISMA[code];
  if (typeof e === "object" && e && "issues" in e) {
    const first = (e as { issues: { message?: string }[] }).issues[0];
    if (first?.message) return first.message;
  }
  const ref = Date.now().toString(36).slice(-5);
  console.error(`[${ref}]`, e);
  return `${GENERIC_ERROR} (réf. ${ref})`;
}
