/**
 * Discord permission arithmetic for the guild bootstrap (`lib/services/discord-setup.ts`).
 *
 * Pure and client-safe (no `server-only`): the admin page needs `botInviteUrl`
 * and the setup state to render the three steps of the « Serveur Discord » card.
 *
 * Permission flags are 64-bit; `1 << 31` overflows JavaScript's signed 32-bit
 * bitwise operators, so every bit is written as `2 ** n` and sums are strings.
 */

/** Permission bits used by the bootstrap (Discord `permissions` flags). */
export const P = {
  MANAGE_CHANNELS: 2 ** 4, // 16
  ADD_REACTIONS: 2 ** 6, // 64
  VIEW: 2 ** 10, // 1024 — VIEW_CHANNEL
  SEND: 2 ** 11, // 2048 — SEND_MESSAGES
  MANAGE_MESSAGES: 2 ** 13, // 8192 (pin the welcome messages)
  EMBED: 2 ** 14, // 16384 — EMBED_LINKS
  ATTACH: 2 ** 15, // 32768 — ATTACH_FILES
  HISTORY: 2 ** 16, // 65536 — READ_MESSAGE_HISTORY
  MANAGE_ROLES: 2 ** 28, // 268435456
  USE_APP_COMMANDS: 2 ** 31, // 2147483648
} as const;

/** Sum of permission bits, as the decimal string Discord expects. */
export function sum(...bits: number[]): string {
  return bits.reduce((n, b) => n + BigInt(b), BigInt(0)).toString();
}

/**
 * Permissions requested by the invite link: manage channels and roles (to
 * create the categories, salons and team roles), plus what the bot needs to
 * talk in them.
 */
export const BOT_INVITE_PERMISSIONS = sum(
  P.MANAGE_CHANNELS,
  P.MANAGE_ROLES,
  P.VIEW,
  P.SEND,
  P.MANAGE_MESSAGES,
  P.EMBED,
  P.HISTORY,
);

/** OAuth2 URL an organiser follows to add the bot to their (empty) server. */
export function botInviteUrl(appId: string, guildId?: string | null): string {
  const q = new URLSearchParams({
    client_id: appId,
    scope: "bot applications.commands",
    permissions: BOT_INVITE_PERMISSIONS,
  });
  if (guildId) {
    q.set("guild_id", guildId);
    q.set("disable_guild_select", "true");
  }
  return `https://discord.com/oauth2/authorize?${q.toString()}`;
}

/** A Discord channel permission overwrite (`type` 0 = role, 1 = member). */
export type Overwrite = { id: string; type: 0 | 1; allow: string; deny: string };

/** What a player may do in their team salons. */
export const MEMBER_ALLOW = sum(P.VIEW, P.SEND, P.ADD_REACTIONS, P.EMBED, P.ATTACH, P.HISTORY, P.USE_APP_COMMANDS);

/** What the bot needs in every salon it writes to. */
export const BOT_ALLOW = sum(P.VIEW, P.SEND, P.MANAGE_MESSAGES, P.EMBED, P.HISTORY);

const NONE = "0";

/** Private team salon: invisible to everyone but the team, the organisers and the bot. */
export function teamOverwrites({
  guildId,
  teamRoleId,
  adminRoleId,
  botId,
}: {
  guildId: string;
  teamRoleId: string;
  adminRoleId?: string | null;
  botId?: string | null;
}): Overwrite[] {
  const out: Overwrite[] = [
    { id: guildId, type: 0, allow: NONE, deny: sum(P.VIEW) },
    { id: teamRoleId, type: 0, allow: MEMBER_ALLOW, deny: NONE },
  ];
  if (adminRoleId) out.push({ id: adminRoleId, type: 0, allow: MEMBER_ALLOW, deny: NONE });
  if (botId) out.push({ id: botId, type: 1, allow: BOT_ALLOW, deny: NONE });
  return out;
}

/** `#général`: everyone reads and reacts, only the organisers (and the bot) write. */
export function generalOverwrites({ guildId, adminRoleId, botId }: { guildId: string; adminRoleId?: string | null; botId?: string | null }): Overwrite[] {
  const out: Overwrite[] = [{ id: guildId, type: 0, allow: sum(P.VIEW, P.HISTORY, P.ADD_REACTIONS), deny: sum(P.SEND) }];
  if (adminRoleId) out.push({ id: adminRoleId, type: 0, allow: sum(P.SEND, P.EMBED, P.ATTACH), deny: NONE });
  if (botId) out.push({ id: botId, type: 1, allow: BOT_ALLOW, deny: NONE });
  return out;
}

/** « Les Hérissons » → « les-herissons » (Discord lowercases and dashes channel names anyway). */
export function channelSlug(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || "salon"
  );
}

/** « #6366f1 » → 6513905, the integer Discord wants for role and embed colours. */
export function hexToInt(color: string | null | undefined): number {
  const m = /^#?([0-9a-f]{6})$/i.exec((color ?? "").trim());
  return m ? parseInt(m[1], 16) : 0;
}

export type TeamDiscordState = {
  discordRoleId: string | null;
  discordChannelId: string | null;
  discordLibraryChannelId: string | null;
};

/** A team is « prête » once it has its role and both salons. */
export function teamDiscordReady(t: TeamDiscordState): boolean {
  return !!(t.discordRoleId && t.discordChannelId && t.discordLibraryChannelId);
}

export type DiscordSetupState = {
  guildId: string | null;
  adminRoleId: string | null;
  generalChannelId: string | null;
  teamsReady: number;
  teamsTotal: number;
  /** Everything the bootstrap creates is in place. */
  complete: boolean;
};

export function discordSetupState(
  challenge: { discordGuildId: string | null; discordAdminRoleId: string | null; discordGeneralChannelId: string | null } | null,
  teams: TeamDiscordState[],
): DiscordSetupState {
  const teamsReady = teams.filter(teamDiscordReady).length;
  const state = {
    guildId: challenge?.discordGuildId ?? null,
    adminRoleId: challenge?.discordAdminRoleId ?? null,
    generalChannelId: challenge?.discordGeneralChannelId ?? null,
    teamsReady,
    teamsTotal: teams.length,
  };
  return { ...state, complete: !!state.guildId && !!state.adminRoleId && !!state.generalChannelId && teams.length > 0 && teamsReady === teams.length };
}
