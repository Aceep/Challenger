import "server-only";

/**
 * Minimal Discord REST client (bot token). Every call is best-effort: failures
 * are logged and swallowed so game actions never depend on Discord being up.
 */
const API = "https://discord.com/api/v10";

export type MessageButton = { customId: string; label: string; style?: 1 | 2 | 3 | 4; disabled?: boolean };

export type OutgoingMessage = {
  content?: string;
  embeds?: { title?: string; description?: string; color?: number; footer?: { text: string }; url?: string }[];
  buttons?: MessageButton[];
};

function enabled() {
  return !!process.env.DISCORD_BOT_TOKEN;
}

function toPayload(m: OutgoingMessage) {
  const rows = [];
  for (let i = 0; i < (m.buttons?.length ?? 0); i += 5) {
    rows.push({
      type: 1,
      components: m.buttons!.slice(i, i + 5).map((b) => ({ type: 2, style: b.style ?? 2, label: b.label.slice(0, 80), custom_id: b.customId, disabled: b.disabled ?? false })),
    });
  }
  return { content: m.content, embeds: m.embeds, components: rows };
}

async function call(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown) {
  if (!enabled()) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      console.error(`[discord] ${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    return res.status === 204 ? {} : ((await res.json()) as { id?: string });
  } catch (e) {
    console.error(`[discord] ${method} ${path} failed`, e);
    return null;
  }
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
  return call(`/applications/${appId}/guilds/${guildId}/commands`, "PUT", commands);
}
