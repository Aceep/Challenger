/**
 * `/challenger` — the only command that exists before a server has a challenge.
 *
 * It is registered **globally** (`GLOBAL_COMMANDS`, `PUT /applications/{id}/commands`)
 * rather than per guild, since the bot must answer it the moment it lands on a
 * server nobody has configured yet. Everything here is pure and client-safe;
 * the writes live in `lib/services/challenger.ts`.
 */

import { P } from "@/lib/discord/permissions";
import type { SlashCommand } from "@/lib/discord/commands";

const SUB_COMMAND = 1;

/** Either permission is enough to speak for the server. */
const MANAGE = BigInt(P.MANAGE_GUILD) | BigInt(P.ADMINISTRATOR);

/**
 * Does this member hold « Gérer le serveur » (or « Administrateur ») ?
 * Discord sends the computed permissions as a decimal string; anything that is
 * not one — absent, empty, garbage — is a no.
 */
export function hasManageGuild(permissions?: string | null): boolean {
  if (!permissions) return false;
  try {
    return (BigInt(permissions) & MANAGE) !== BigInt(0);
  } catch {
    return false;
  }
}

export const CHALLENGER_COMMAND: SlashCommand = {
  name: "challenger",
  description: "Créer le défi lecture de ce serveur",
  dm_permission: false,
  options: [
    {
      type: SUB_COMMAND,
      name: "creer",
      // No option: the command opens a form (nom, début, durée, équipes), which
      // holds far more than a slash command comfortably can.
      description: "Créer le défi lecture de ce serveur (réservé à « Gérer le serveur »)",
    },
  ],
};

/**
 * Registered once for the whole application, unlike `SLASH_COMMANDS`, which the
 * guild bootstrap installs server by server. Keeping the two lists disjoint
 * avoids a duplicate `/challenger` on configured servers.
 */
export const GLOBAL_COMMANDS: SlashCommand[] = [CHALLENGER_COMMAND];

/** What the interaction payload carries for a sub-command. */
type IncomingOption = { name: string; type?: number; value?: string | number | boolean; options?: IncomingOption[] };

export type ChallengerInteraction = { sub: "creer" };

/**
 * Reads `data.options` of a `/challenger` interaction; null when the sub-command
 * is not `creer`.
 *
 * The name of the challenge no longer travels here: `creer` answers with a
 * modal, and everything is typed in it. An old client still sending `nom:` is
 * read as a plain `creer` — the form simply opens with its own pre-fill.
 *
 * `rejoindre` used to sit here: joining is now the organiser's invitation only.
 * Discord keeps offering a retired sub-command until the global commands are
 * re-registered (up to an hour of propagation), so that null is a normal case —
 * the route answers it with the explanation, never with an error.
 */
export function parseChallengerInteraction(options?: IncomingOption[] | null): ChallengerInteraction | null {
  const sub = (options ?? []).find((o) => o.name === "creer");
  return sub ? { sub: "creer" } : null;
}
