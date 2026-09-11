/**
 * `/inviter` — inviting from Discord, without a single 18-digit identifier.
 *
 * Discord's `USER` option gives the member picker of the client: one types the
 * first letters of a pseudonym and picks a face. The payload then carries the
 * ids in `data.options` and the accounts themselves in `data.resolved.users`,
 * which is the only way to tell a bot from a person.
 *
 * Pure and client-safe (no I/O, no `server-only`): the definition is shared
 * with the registration script, and the parsing is unit-tested. The writes live
 * in `lib/services/invites.ts`.
 */

import type { SlashCommand } from "@/lib/discord/commands";

const STRING = 3;
const USER = 6;

/** How many members one command may invite at once — five option slots. */
export const MAX_INVITES = 5;

/** `membre1` … `membre5`, in order: Discord refuses a required option after an optional one. */
export const MEMBER_OPTIONS = Array.from({ length: MAX_INVITES }, (_, i) => `membre${i + 1}`);

export const INVITE_ROLE_CHOICES = [
  { name: "joueur·euse", value: "PLAYER" },
  { name: "organisateur·ice", value: "ORGANIZER" },
];

/**
 * No `default_member_permissions`: a co-organiser of the edition does not
 * necessarily hold « Gérer le serveur », and the real check is the ORGANIZER
 * role **inside the challenge** (`ChallengeMember`), done by the route.
 */
export const INVITE_COMMAND: SlashCommand = {
  name: "inviter",
  description: "Inviter jusqu'à cinq membres du serveur dans le défi (organisateur·ices)",
  dm_permission: false,
  options: [
    { type: USER, name: MEMBER_OPTIONS[0], description: "La personne à inviter", required: true },
    ...MEMBER_OPTIONS.slice(1).map((name, i) => ({ type: USER, name, description: `Une ${i + 2}ᵉ personne à inviter (facultatif)` })),
    { type: STRING, name: "equipe", description: "Équipe d'accueil (facultatif : l'équipe peut être choisie plus tard)", autocomplete: true },
    { type: STRING, name: "role", description: "Rôle dans le défi (joueur·euse par défaut)", choices: INVITE_ROLE_CHOICES },
  ],
};

/** An option as the interaction payload carries it. */
export type InviteOption = { name: string; type?: number; value?: string | number | boolean };

/** `data.resolved` — the accounts behind the ids of the USER options. */
export type ResolvedUsers = { users?: Record<string, { id: string; bot?: boolean; username?: string }> };

export type InviteRole = "PLAYER" | "ORGANIZER";

export type ParsedInvite = { discordIds: string[]; teamId: string | null; role: InviteRole };

export type InviteParseResult = { ok: true; data: ParsedInvite } | { ok: false; error: string };

/** Kyle is a bot, and a bot has no account on the site: no invitation for them. */
export const NO_BOTS = "Kyle ne joue pas, et les autres bots non plus.";
const NOBODY = "Indique au moins une personne à inviter.";

/**
 * Reads a `/inviter` payload: the member ids in order, without duplicates (the
 * same person named twice is one invitation), the team and the role.
 */
export function parseInviteInteraction(options: InviteOption[] = [], resolved: ResolvedUsers = {}): InviteParseResult {
  const byName = new Map(options.map((o) => [o.name, o.value]));
  const discordIds: string[] = [];

  for (const name of MEMBER_OPTIONS) {
    const value = byName.get(name);
    if (value === undefined || value === null || value === "") continue;
    const id = String(value);
    if (resolved.users?.[id]?.bot) return { ok: false, error: NO_BOTS };
    if (!discordIds.includes(id)) discordIds.push(id);
  }
  if (!discordIds.length) return { ok: false, error: NOBODY };

  const teamId = String(byName.get("equipe") ?? "").trim() || null;
  const role: InviteRole = byName.get("role") === "ORGANIZER" ? "ORGANIZER" : "PLAYER";
  return { ok: true, data: { discordIds, teamId, role } };
}
