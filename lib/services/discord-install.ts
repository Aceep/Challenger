import "server-only";
import { APP_URL } from "@/lib/discord/help";
import { createDmChannel, getGuild, postMessage, type OutgoingMessage } from "@/lib/discord/rest";
import { installWelcomeMessage, WELCOME_GUILD_KEY } from "@/lib/discord/welcome";
import { once } from "@/lib/services/bot-events";
import { challengeForGuild } from "@/lib/services/membership";

/**
 * What happens when someone adds the app to a Discord server.
 *
 * Discord has no gateway here (HTTP only), so the install is learned from the
 * `APPLICATION_AUTHORIZED` webhook event (`app/api/discord/events/route.ts`).
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

/** One DM, at most once per (server, recipient). */
async function welcome(userId: string, key: string, message: OutgoingMessage) {
  await once(key, async () => {
    const channel = await createDmChannel(userId);
    if (!channel.ok) {
      console.error(`[discord] no DM channel for ${userId} (${channel.status}) — ${channel.error}`);
      return;
    }
    // `request()` already logged the failure; a 403 / code 50007 here just means
    // the person refuses DMs from server members, which is not our business.
    const sent = await postMessage(channel.data.id, message);
    if (!sent) console.error(`[discord] welcome DM to ${userId} not delivered (blocked DMs give ${CANNOT_DM})`);
  });
}

/**
 * Greets the person who added the app — and the server owner when that is
 * someone else — with how to open a challenge on this server.
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
    const message = installWelcomeMessage({ guildName: data.guild?.name ?? "ce serveur", appUrl: APP_URL(), existing });

    await welcome(userId, WELCOME_GUILD_KEY(guildId, userId), message);

    // The owner is in the payload for a fresh install; ask Discord otherwise.
    let ownerId = data.guild?.owner_id ?? null;
    if (!ownerId) {
      const guild = await getGuild(guildId);
      ownerId = guild.ok ? (guild.data.owner_id ?? null) : null;
    }
    if (ownerId && ownerId !== userId) await welcome(ownerId, WELCOME_GUILD_KEY(guildId, ownerId), message);
  } catch (e) {
    console.error("[discord] welcome on install failed", e);
  }
}
