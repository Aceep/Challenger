/**
 * Registers the slash commands on one guild (instant). Re-run after changing commands.
 * Usage: npm run discord:register -- <guildId>   (or DISCORD_GUILD_ID in env)
 *
 * The definitions live in `lib/discord/commands.ts` so the in-app « Configurer
 * le serveur Discord » button registers exactly the same list.
 */
import { SLASH_COMMANDS } from "../lib/discord/commands";

const appId = process.env.AUTH_DISCORD_ID;
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.argv[2] ?? process.env.DISCORD_GUILD_ID;
if (!appId || !token || !guildId) throw new Error("AUTH_DISCORD_ID, DISCORD_BOT_TOKEN and a guild id are required");

const res = await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(SLASH_COMMANDS),
});
console.log(res.status, res.ok ? `${SLASH_COMMANDS.length} commandes enregistrées sur le serveur ${guildId}` : await res.text());
