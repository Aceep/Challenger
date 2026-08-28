/**
 * Pure logic of the FAQ bridge (no I/O): what the bot writes in the forum, how a
 * question's status moves, and how the messages typed directly in Discord are
 * turned into rows to insert. Unit-tested in `faq.test.ts`.
 */

export type QuestionStatus = "OPEN" | "ANSWERED" | "RESOLVED";

/** Ids of the three forum tags, stored on `Challenge.discordFaqTags`. */
export type FaqTags = { open: string; answered: string; resolved: string };

export const FAQ_TAG_NAMES = [
  { key: "open", name: "Ouverte", emoji: "🟡" },
  { key: "answered", name: "Répondue", emoji: "🔵" },
  { key: "resolved", name: "Résolue", emoji: "✅" },
] as const;

export const FAQ_CHANNEL_NAME = "faq";
export const FAQ_ROLE_NAME = "Organisateurs";

/** Manage Channels + Manage Roles + the usual message permissions. */
export const FAQ_BOT_PERMISSIONS = "268453904";

/** Reads the Json column back into typed tag ids (null when never configured). */
export function parseFaqTags(raw: unknown): FaqTags | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  return typeof t.open === "string" && typeof t.answered === "string" && typeof t.resolved === "string"
    ? { open: t.open, answered: t.answered, resolved: t.resolved }
    : null;
}

/** Starter message of the forum thread: who asks, plus a ping of the organisers. */
export function questionPostContent({ authorDiscordId, roleId, body }: { authorDiscordId?: string | null; roleId?: string | null; body: string }) {
  const who = authorDiscordId ? `Question de <@${authorDiscordId}>` : "Nouvelle question";
  const head = `❓ **${who}**${roleId ? ` <@&${roleId}>` : ""}`;
  const text = body.trim();
  return text ? `${head}\n\n${text}` : head;
}

/** A reply pushed from the site into the thread. Admin answers ping the author. */
export function replyContent({ name, isAdmin, mentionUserId, body }: { name: string; isAdmin: boolean; mentionUserId?: string | null; body: string }) {
  const head = `${isAdmin ? "✅" : "💬"} **${name}**${isAdmin ? " · organisation" : ""}${mentionUserId ? ` → <@${mentionUserId}>` : ""}`;
  return `${head}\n\n${body.trim()}`;
}

export const resolvedContent = (name: string) => `✅ Question résolue par **${name}**. Le sujet est archivé.`;
export const pinnedContent = (pinned: boolean) => (pinned ? "📌 Ajoutée à la FAQ du site." : "📌 Retirée de la FAQ du site.");

export function threadUrl(guildId: string | null | undefined, threadId: string | null | undefined) {
  return guildId && threadId ? `https://discord.com/channels/${guildId}/${threadId}` : null;
}

export function channelUrl(guildId: string | null | undefined, channelId: string | null | undefined) {
  return guildId && channelId ? `https://discord.com/channels/${guildId}/${channelId}` : null;
}

/** Invitation link to re-add the bot with the permissions the FAQ needs. */
export function botInviteUrl(appId: string | null | undefined) {
  return appId ? `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot%20applications.commands&permissions=${FAQ_BOT_PERMISSIONS}` : null;
}

/** A first answer from the organisation moves Ouverte → Répondue; Résolue is final. */
export function nextStatus(current: QuestionStatus, { adminReplied }: { adminReplied: boolean }): QuestionStatus {
  if (current === "RESOLVED") return "RESOLVED";
  return adminReplied ? "ANSWERED" : current;
}

/** The single tag a thread carries for a status (empty when the forum has no tags). */
export function tagsFor(status: QuestionStatus, tags: FaqTags | null): string[] {
  if (!tags) return [];
  const id = status === "RESOLVED" ? tags.resolved : status === "ANSWERED" ? tags.answered : tags.open;
  return id ? [id] : [];
}

/** Snowflake ids are numeric strings: longer wins, then lexicographic. */
export function compareSnowflakes(a: string, b: string) {
  return a.length === b.length ? (a < b ? -1 : a > b ? 1 : 0) : a.length - b.length;
}

export type RawDiscordMessage = {
  id: string;
  content?: string;
  type?: number;
  author?: { id: string; username?: string; global_name?: string | null; bot?: boolean };
};

export type ImportedMessage = {
  discordMessageId: string;
  authorId: string | null;
  discordUserId: string;
  discordUserName: string;
  body: string;
  isAdmin: boolean;
};

/** Regular user messages and replies; anything else (joins, pins…) is skipped. */
const TEXT_TYPES = new Set([0, 19, 21]);

/**
 * Turns a REST page of thread messages into rows to insert: the bot's own posts,
 * other bots, already-imported ids and empty messages are dropped. `lastMessageId`
 * advances the poll cursor over *every* message seen, skipped ones included.
 */
export function mapDiscordMessages(
  raw: RawDiscordMessage[],
  { botAppId, knownUsers, knownMessageIds }: { botAppId?: string | null; knownUsers: Map<string, { id: string; role: "ADMIN" | "PLAYER" }>; knownMessageIds?: Set<string> },
): { messages: ImportedMessage[]; lastMessageId: string | null } {
  const sorted = [...raw].sort((a, b) => compareSnowflakes(a.id, b.id));
  const messages: ImportedMessage[] = [];
  let lastMessageId: string | null = null;

  for (const m of sorted) {
    lastMessageId = m.id;
    const author = m.author;
    if (!author?.id) continue;
    if (author.bot || (botAppId && author.id === botAppId)) continue;
    if (m.type !== undefined && !TEXT_TYPES.has(m.type)) continue;
    if (knownMessageIds?.has(m.id)) continue;
    const body = (m.content ?? "").trim();
    if (!body) continue;
    const known = knownUsers.get(author.id) ?? null;
    messages.push({
      discordMessageId: m.id,
      authorId: known?.id ?? null,
      discordUserId: author.id,
      discordUserName: author.global_name || author.username || "Discord",
      body: body.slice(0, 4000),
      isAdmin: known?.role === "ADMIN",
    });
  }
  return { messages, lastMessageId };
}
