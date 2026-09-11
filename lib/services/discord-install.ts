import "server-only";
import { APP_URL } from "@/lib/app-url";
import { GLOBAL_COMMANDS } from "@/lib/discord/challenger";
import { commandsFingerprint } from "@/lib/discord/commands";
import { createDmChannel, getGuild, getGuildChannels, postMessage, registerGlobalCommands, type OutgoingMessage } from "@/lib/discord/rest";
import { installWelcomeMessage, WELCOME_CHANNEL_KEY, WELCOME_GUILD_KEY, type WelcomeInput } from "@/lib/discord/welcome";
import { once } from "@/lib/services/bot-events";
import { challengeForGuild } from "@/lib/services/membership";

/**
 * What happens when someone adds the app to a Discord server.
 *
 * Discord has no gateway here (HTTP only), so the install is learned from the
 * `APPLICATION_AUTHORIZED` webhook event (`app/api/discord/events/route.ts`),
 * which answers 204 straight away and runs this inside `after()`.
 * The whole thing is best-effort: an install must never fail because a DM
 * could not be delivered, so nothing throws and everything is logged.
 */

/** `data` of an `APPLICATION_AUTHORIZED` event. */
export type AppAuthorizedData = {
  /** 0 = guild install, 1 = user install; absent on older payloads = guild. */
  integration_type?: number;
  user?: { id?: string; username?: string; global_name?: string | null };
  scopes?: string[];
  guild?: { id?: string; name?: string; owner_id?: string };
};

/** Discord's « Cannot send messages to this user » — the person blocks DMs. */
const CANNOT_DM = 50007;
/** An app installed on a user account, not on a server: no one to welcome. */
const USER_INSTALL = 1;
/** `type` of a plain text channel. */
const TEXT_CHANNEL = 0;

/** Did the welcome reach the person? `skipped` = already sent for that (server, recipient). */
type Delivery = "sent" | "failed" | "skipped";

/** One DM, at most once per (server, recipient). */
async function welcome(userId: string, key: string, message: OutgoingMessage): Promise<Delivery> {
  let delivered = false;
  const ran = await once(key, async () => {
    const channel = await createDmChannel(userId);
    if (!channel.ok) {
      console.error(`[discord] no DM channel for ${userId} (${channel.status}) — ${channel.error}`);
      return;
    }
    // `request()` already logged the failure; a 403 / code 50007 here just means
    // the person refuses DMs from server members, which is not our business.
    const sent = await postMessage(channel.data.id, message);
    if (sent) delivered = true;
    else console.error(`[discord] welcome DM to ${userId} not delivered (blocked DMs give ${CANNOT_DM})`);
  });
  return ran ? (delivered ? "sent" : "failed") : "skipped";
}

/**
 * Where to post when nobody can be reached in private: the server's system
 * channel (« Salon système », where Discord already writes its join notices),
 * else the first text channel — the topmost one in the sidebar, which is what
 * `position` orders.
 */
async function fallbackChannel(guildId: string, systemChannelId: string | null): Promise<string | null> {
  if (systemChannelId) return systemChannelId;
  const channels = await getGuildChannels(guildId);
  if (!channels.ok) return null;
  const texts = channels.data.filter((c) => c.type === TEXT_CHANNEL);
  if (!texts.length) return null;
  return texts.reduce((best, c) => ((c.position ?? Number.MAX_SAFE_INTEGER) < (best.position ?? Number.MAX_SAFE_INTEGER) ? c : best)).id;
}

/**
 * The global commands are registered again only when their definition changed:
 * the fingerprint is the key, so every install of an unchanged list is a no-op.
 * `npm run discord:register -- --global` stays available, it is no longer required.
 */
async function ensureGlobalCommands() {
  const appId = process.env.AUTH_DISCORD_ID;
  if (!appId) return;
  await once(`global-commands:${commandsFingerprint(GLOBAL_COMMANDS)}`, async () => {
    const r = await registerGlobalCommands(appId, GLOBAL_COMMANDS);
    if (!r.ok) console.error(`[discord] global commands not registered (${r.status}) — ${r.error}`);
  });
}

/**
 * Greets the person who added the app — and the server owner when that is
 * someone else — with how to open a challenge on this server. When that DM
 * bounces, the same three steps go to a salon of the server, once, so the
 * install is never a dead end.
 */
export async function handleAppAuthorized(data: AppAuthorizedData): Promise<void> {
  try {
    const guildId = data.guild?.id;
    const userId = data.user?.id;
    // A user install has no server to run a challenge on: nothing to say.
    if (!guildId || !userId || data.integration_type === USER_INSTALL) return;

    const found = await challengeForGuild(guildId);
    // A finished edition is not a challenge to join: the server starts over.
    const existing = found && found.status !== "FINISHED" ? { name: found.name } : null;
    const input: WelcomeInput = { guildName: data.guild?.name ?? "ce serveur", appUrl: APP_URL(), existing };
    const message = installWelcomeMessage(input);

    const toInstaller = await welcome(userId, WELCOME_GUILD_KEY(guildId, userId), message);

    // The owner is in the payload for a fresh install; ask Discord otherwise —
    // the same call carries the system channel the fallback needs.
    let ownerId = data.guild?.owner_id ?? null;
    let systemChannelId: string | null = null;
    if (!ownerId || toInstaller === "failed") {
      const guild = await getGuild(guildId);
      if (guild.ok) {
        ownerId = ownerId ?? guild.data.owner_id ?? null;
        systemChannelId = guild.data.system_channel_id ?? null;
      }
    }
    if (ownerId && ownerId !== userId) await welcome(ownerId, WELCOME_GUILD_KEY(guildId, ownerId), message);

    if (toInstaller === "failed") {
      await once(WELCOME_CHANNEL_KEY(guildId), async () => {
        const channel = await fallbackChannel(guildId, systemChannelId);
        if (!channel) return;
        await postMessage(channel, installWelcomeMessage(input, "channel"));
      });
    }

    await ensureGlobalCommands();
  } catch (e) {
    console.error("[discord] welcome on install failed", e);
  }
}
