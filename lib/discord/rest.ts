import "server-only";

/**
 * Minimal Discord REST client (bot token). Every call is best-effort: failures
 * are logged and swallowed so game actions never depend on Discord being up.
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

/** Marker returned by `listMessages` when the channel/thread no longer exists (404). */
export const GONE = Symbol("discord-gone");

async function request<T>(path: string, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown, onNotFound?: () => void): Promise<T | null> {
  if (!enabled()) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      if (res.status === 404 && onNotFound) onNotFound();
      else console.error(`[discord] ${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    return res.status === 204 ? ({} as T) : ((await res.json()) as T);
  } catch (e) {
    console.error(`[discord] ${method} ${path} failed`, e);
    return null;
  }
}

const call = (path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown) => request<{ id?: string }>(path, method, body);

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
  return call(`/applications/${appId}/guilds/${guildId}/commands`, "PUT", commands);
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
  return r?.id ? { id: r.id, tags: r.available_tags ?? [] } : null;
}

/** Creates a mentionable role. Needs « Gérer les rôles ». */
export async function createRole(guildId: string, name: string, color: number) {
  const r = await request<{ id: string }>(`/guilds/${guildId}/roles`, "POST", { name, color, mentionable: true, hoist: false });
  return r?.id ?? null;
}

/** Gives a role to a member; true when Discord accepted. */
export async function addMemberRole(guildId: string, userId: string, roleId: string) {
  return (await request(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, "PUT")) !== null;
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
  return r?.id ? { threadId: r.id, messageId: r.message?.id ?? null } : null;
}

export type DiscordMessage = {
  id: string;
  content?: string;
  type?: number;
  author?: { id: string; username?: string; global_name?: string | null; bot?: boolean };
};

/** Up to 100 messages of a channel/thread, optionally only those after a message id; `GONE` when the thread was deleted. */
export async function listMessages(channelId: string, after?: string | null): Promise<DiscordMessage[] | typeof GONE> {
  const q = new URLSearchParams({ limit: "100" });
  if (after) q.set("after", after);
  let gone = false;
  const r = await request<DiscordMessage[]>(`/channels/${channelId}/messages?${q}`, "GET", undefined, () => (gone = true));
  return gone ? GONE : (r ?? []);
}

/** Deletes a channel or thread (already-deleted is treated as success). */
export async function deleteChannel(channelId: string): Promise<boolean> {
  let gone = false;
  const r = await request(`/channels/${channelId}`, "DELETE", undefined, () => (gone = true));
  return gone || r !== null;
}

/** Updates a thread: tags, archive, lock. */
export async function patchThread(threadId: string, data: { applied_tags?: string[]; archived?: boolean; locked?: boolean }) {
  return call(`/channels/${threadId}`, "PATCH", data);
}
