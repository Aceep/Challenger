/**
 * Registers the slash commands.
 *
 * - `npm run discord:register -- --global` (or with no guild id) installs the
 *   application-wide commands: `/challenger`, which must answer on a server
 *   that has no challenge yet. Propagation takes up to an hour.
 * - `npm run discord:register -- <guildId>` (or DISCORD_GUILD_ID in env)
 *   installs the game commands on that guild — instant.
 *
 * The definitions live in `lib/discord/commands.ts` and
 * `lib/discord/challenger.ts` so the in-app « Configurer le serveur Discord »
 * button registers exactly the same lists.
 */
import { GLOBAL_COMMANDS } from "../lib/discord/challenger";
import { SLASH_COMMANDS } from "../lib/discord/commands";

const appId = process.env.AUTH_DISCORD_ID;
const token = process.env.DISCORD_BOT_TOKEN;
if (!appId || !token) throw new Error("AUTH_DISCORD_ID and DISCORD_BOT_TOKEN are required");

const arg = process.argv[2];
const guildId = arg === "--global" ? undefined : (arg ?? process.env.DISCORD_GUILD_ID);
const global = !guildId;

const commands = global ? GLOBAL_COMMANDS : SLASH_COMMANDS;
const path = global ? `applications/${appId}/commands` : `applications/${appId}/guilds/${guildId}/commands`;

const res = await fetch(`https://discord.com/api/v10/${path}`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands),
});

const names = commands.map((c) => `/${c.name}`).join(", ");
const where = global ? "globalement (propagation ≤ 1 h)" : `sur le serveur ${guildId}`;
console.log(res.status, res.ok ? `${commands.length} commande(s) enregistrée(s) ${where} : ${names}` : await res.text());
