import "server-only";
import type { Overwrite } from "@/lib/discord/permissions";

/**
 * Minimal Discord REST client (bot token).
 *
 * Two levels:
 * - `postMessage` / `editMessage` are best-effort: failures are logged and
 *   swallowed so game actions never depend on Discord being up.
 * - `request()` returns a `DiscordResult` so the guild bootstrap
 *   (`lib/services/discord-setup.ts`) can report what failed and why.
 */
const API = "https://discord.com/api/v10";

export type MessageButton = { customId: string; label: string; style?: 1 | 2 | 3 | 4; disabled?: boolean };

/** Pings are ignored unless they are explicitly allowed, so roles/users must be listed. */
export type AllowedMentions = { roles?: string[]; users?: string[] };

export type OutgoingMessage = {
  content?: string;
  embeds?: { title?: string; description?: string; color?: number; footer?: { text: string }; url?: string }[];
  buttons?: MessageButton[];
  allowedMentions?: AllowedMentions;
};

export type DiscordResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function enabled() {
  return !!process.env.DISCORD_BOT_TOKEN;
}

/** `parse: []` disables @everyone; only the listed roles/users are actually pinged. */
function toAllowedMentions(a: AllowedMentions | undefined) {
  if (!a) return undefined;
  return { parse: [] as string[], roles: a.roles ?? [], users: a.users ?? [] };
}

function toPayload(m: OutgoingMessage) {
  const rows = [];
  for (let i = 0; i < (m.buttons?.length ?? 0); i += 5) {
    rows.push({
      type: 1,
      components: m.buttons!.slice(i, i + 5).map((b) => ({ type: 2, style: b.style ?? 2, label: b.label.slice(0, 80), custom_id: b.customId, disabled: b.disabled ?? false })),
    });
  }
  return { content: m.content, embeds: m.embeds, components: rows, allowed_mentions: toAllowedMentions(m.allowedMentions) };
}

/**
 * One REST call. Retries once on 429 (rate limit) after `retry_after`.
 * A 204 resolves to an empty object.
 */
export async function request<T>(path: string, method: Method = "GET", body?: unknown, retry = true): Promise<DiscordResult<T>> {
  if (!enabled()) return { ok: false, status: 0, error: "DISCORD_BOT_TOKEN manquant." };
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 429 && retry) {
      // `retry_after` (seconds, float) comes in the body, mirrored by the header.
      const header = Number(res.headers.get("retry-after"));
      const fromBody = await res.json().catch(() => null);
      const after = Number.isFinite(header) && header > 0 ? header : Number((fromBody as { retry_after?: number } | null)?.retry_after) || 1;
      await sleep(Math.min(after * 1000 + 250, 10_000));
      return request<T>(path, method, body, false);
    }
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      console.error(`[discord] ${method} ${path} → ${res.status}: ${text}`);
      return { ok: false, status: res.status, error: text || `HTTP ${res.status}` };
    }
    return { ok: true, data: (res.status === 204 ? {} : await res.json()) as T };
  } catch (e) {
    console.error(`[discord] ${method} ${path} failed`, e);
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Best-effort variant: the payload, or null when anything went wrong. */
async function call(path: string, method: Method, body?: unknown) {
  const r = await request<{ id?: string }>(path, method, body);
  return r.ok ? r.data : null;
}

/** Returns the created message id, or null. */
export async function postMessage(channelId: string | null | undefined, m: OutgoingMessage): Promise<string | null> {
  if (!channelId) return null;
  const r = await call(`/channels/${channelId}/messages`, "POST", toPayload(m));
  return r?.id ?? null;
}

export async function editMessage(channelId: string | null | undefined, messageId: string | null | undefined, m: OutgoingMessage) {
  if (!channelId || !messageId) return;
  await call(`/channels/${channelId}/messages/${messageId}`, "PATCH", toPayload(m));
}

/** Registers slash commands for one guild (instant, unlike global commands). */
export async function registerGuildCommands(appId: string, guildId: string, commands: unknown[]) {
  return request<unknown[]>(`/applications/${appId}/guilds/${guildId}/commands`, "PUT", commands);
}

// ---------------------------------------------------------------------------
// Guild bootstrap helpers (see lib/services/discord-setup.ts)
// ---------------------------------------------------------------------------

export type GuildRole = { id: string; name: string; color?: number; managed?: boolean; position?: number };
/** `type` 0 = text channel, 4 = category. */
export type GuildChannel = { id: string; name?: string; type: number; parent_id?: string | null };

export function getGuildRoles(guildId: string) {
  return request<GuildRole[]>(`/guilds/${guildId}/roles`);
}

export function getGuildChannels(guildId: string) {
  return request<GuildChannel[]>(`/guilds/${guildId}/channels`);
}

export function createRole(guildId: string, role: { name: string; color?: number; mentionable?: boolean; hoist?: boolean }) {
  return request<GuildRole>(`/guilds/${guildId}/roles`, "POST", {
    name: role.name.slice(0, 100),
    color: role.color ?? 0,
    mentionable: role.mentionable ?? true,
    hoist: role.hoist ?? false,
    permissions: "0",
  });
}

export function createChannel(
  guildId: string,
  channel: { name: string; type: 0 | 4; parentId?: string | null; topic?: string; permissionOverwrites?: Overwrite[] },
) {
  return request<GuildChannel>(`/guilds/${guildId}/channels`, "POST", {
    name: channel.name.slice(0, 100),
    type: channel.type,
    parent_id: channel.parentId ?? undefined,
    topic: channel.topic?.slice(0, 1024),
    permission_overwrites: channel.permissionOverwrites,
  });
}

export function getGuildMember(guildId: string, userId: string) {
  return request<{ user?: { id: string }; roles?: string[] }>(`/guilds/${guildId}/members/${userId}`);
}

export function addMemberRole(guildId: string, userId: string, roleId: string) {
  return request<unknown>(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, "PUT");
}

export function removeMemberRole(guildId: string, userId: string, roleId: string) {
  return request<unknown>(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, "DELETE");
}

/** Pins a message (falls back to the legacy route on older API behaviour). */
export async function pinMessage(channelId: string, messageId: string) {
  const r = await request<unknown>(`/channels/${channelId}/messages/pins/${messageId}`, "PUT");
  if (!r.ok && r.status === 404) return request<unknown>(`/channels/${channelId}/pins/${messageId}`, "PUT");
  return r;
}

// ---------------------------------------------------------------------------
// FAQ forum: channel/role creation, threads and incremental message polling
// ---------------------------------------------------------------------------

const FORUM_CHANNEL = 15;

export type ForumTag = { id: string; name: string };

/** Creates a forum channel with its available tags. Needs « Gérer les salons ». */
export async function createForumChannel(guildId: string, name: string, tags: { name: string; emoji?: string }[]) {
  const r = await request<{ id: string; available_tags?: ForumTag[] }>(`/guilds/${guildId}/channels`, "POST", {
    type: FORUM_CHANNEL,
    name,
    available_tags: tags.map((t) => ({ name: t.name, moderated: false, emoji_name: t.emoji ?? null })),
  });
  return r.ok && r.data.id ? { id: r.data.id, tags: r.data.available_tags ?? [] } : null;
}

/** Opens a thread in a forum channel with its starter message. */
export async function createForumPost(
  forumId: string,
  { name, content, appliedTags, allowedMentions }: { name: string; content: string; appliedTags?: string[]; allowedMentions?: AllowedMentions },
) {
  const r = await request<{ id: string; message?: { id: string } }>(`/channels/${forumId}/threads`, "POST", {
    name: name.slice(0, 100),
    applied_tags: appliedTags?.length ? appliedTags : undefined,
    message: { content: content.slice(0, 2000), allowed_mentions: toAllowedMentions(allowedMentions) },
  });
  return r.ok && r.data.id ? { threadId: r.data.id, messageId: r.data.message?.id ?? null } : null;
}

export type DiscordMessage = {
  id: string;
  content?: string;
  type?: number;
  author?: { id: string; username?: string; global_name?: string | null; bot?: boolean };
};

/** Up to 100 messages of a channel/thread, optionally only those after a message id. */
export async function listMessages(channelId: string, after?: string | null): Promise<DiscordMessage[]> {
  const q = new URLSearchParams({ limit: "100" });
  if (after) q.set("after", after);
  const r = await request<DiscordMessage[]>(`/channels/${channelId}/messages?${q}`, "GET");
  return r.ok ? r.data : [];
}

/** Updates a thread: tags, archive, lock. */
export async function patchThread(threadId: string, data: { applied_tags?: string[]; archived?: boolean; locked?: boolean }) {
  return call(`/channels/${threadId}`, "PATCH", data);
}
