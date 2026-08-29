import "server-only";
import { prisma } from "@/lib/db";
import { GLOBAL_COMMANDS } from "@/lib/discord/challenger";
import { SLASH_COMMANDS } from "@/lib/discord/commands";
import { welcomeMessage } from "@/lib/discord/help";
import { channelSlug, generalOverwrites, hexToInt, teamOverwrites } from "@/lib/discord/permissions";
import { publishTeamGuide } from "@/lib/services/team-guide";
import {
  addMemberRole,
  createChannel,
  createRole,
  getGuildChannels,
  getGuildMember,
  getGuildRoles,
  pinMessage,
  postMessage,
  registerGlobalCommands,
  registerGuildCommands,
  removeMemberRole,
  sleep,
  type GuildChannel,
  type GuildRole,
} from "@/lib/discord/rest";
import { once } from "@/lib/services/bot-events";
import { organizersWithDiscord } from "@/lib/services/membership";
import { GameError } from "@/lib/errors";

/**
 * One-click Discord server bootstrap (organiser side).
 *
 * A bot cannot create a usable server on its own: the organiser creates an
 * empty one, pastes its id, invites the bot with the generated link, then runs
 * this. Everything here is **resumable** — each created id is persisted right
 * away, and a second run only fills what is missing (« 0 créé, n déjà en place »).
 */

const ADMIN_ROLE_NAME = "Organisateurs";
const GENERAL_NAME = "général";
const ADVENTURE_NAME = "aventure";
const LIBRARY_NAME = "librairie";

/** Pause between mutations: stays well below Discord's guild rate limits. */
const PACE = 350;

export type SetupSummary = {
  /** Human labels of what was created (« rôle Organisateurs », « #librairie · Les Hérissons »…). */
  created: string[];
  /** Already in place, or intentionally left alone. */
  skipped: string[];
  errors: string[];
  rolesAssigned: number;
  welcomed: number;
};

const bySlug = (channels: GuildChannel[], type: number, name: string, parentId?: string | null) =>
  channels.find((c) => c.type === type && channelSlug(c.name ?? "") === channelSlug(name) && (parentId === undefined || (c.parent_id ?? null) === parentId));

export async function setupGuild(challengeId: string): Promise<SetupSummary> {
  const out: SetupSummary = { created: [], skipped: [], errors: [], rolesAssigned: 0, welcomed: 0 };

  const botId = process.env.AUTH_DISCORD_ID;
  if (!process.env.DISCORD_BOT_TOKEN || !botId) throw new GameError("Le bot n'est pas configuré : AUTH_DISCORD_ID et DISCORD_BOT_TOKEN sont requis.");

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new GameError("Défi introuvable.");
  const guildId = challenge.discordGuildId;
  if (!guildId) throw new GameError("Renseigne d'abord l'identifiant du serveur Discord, puis enregistre le défi.");

  const teams = await prisma.team.findMany({
    where: { challengeId },
    orderBy: { name: "asc" },
    include: { members: { include: { user: { select: { id: true, name: true, discordId: true } } } } },
  });
  const admins = await organizersWithDiscord(challengeId);

  // --- 1. Inventory (also tells us whether the bot is actually on the server).
  const [rolesRes, channelsRes] = [await getGuildRoles(guildId), await getGuildChannels(guildId)];
  if (!rolesRes.ok || !channelsRes.ok) {
    const status = rolesRes.ok ? (channelsRes.ok ? 0 : channelsRes.status) : rolesRes.status;
    if ([401, 403, 404].includes(status)) {
      throw new GameError("Le bot n'est pas sur le serveur ou n'a pas les permissions nécessaires : ré-invite-le avec le lien ci-dessus.");
    }
    throw new GameError("Discord n'a pas répondu : réessaie dans un instant.");
  }
  const roles: GuildRole[] = rolesRes.data;
  const channels: GuildChannel[] = channelsRes.data;
  const roleExists = (id: string | null) => !!id && roles.some((r) => r.id === id);
  const channelExists = (id: string | null) => !!id && channels.some((c) => c.id === id);

  // --- 2. « Organisateurs » role.
  let adminRoleId = challenge.discordAdminRoleId;
  if (!roleExists(adminRoleId)) {
    const existing = roles.find((r) => r.name === ADMIN_ROLE_NAME && !r.managed);
    if (existing) {
      adminRoleId = existing.id;
      out.skipped.push(`rôle ${ADMIN_ROLE_NAME}`);
    } else {
      const r = await createRole(guildId, { name: ADMIN_ROLE_NAME, color: hexToInt(challenge.color), hoist: true, mentionable: true });
      await sleep(PACE);
      if (!r.ok) {
        out.errors.push(`rôle ${ADMIN_ROLE_NAME} : ${r.error}`);
        adminRoleId = null;
      } else {
        adminRoleId = r.data.id;
        roles.push(r.data);
        out.created.push(`rôle ${ADMIN_ROLE_NAME}`);
      }
    }
    if (adminRoleId) await prisma.challenge.update({ where: { id: challengeId }, data: { discordAdminRoleId: adminRoleId } });
  } else {
    out.skipped.push(`rôle ${ADMIN_ROLE_NAME}`);
  }

  // --- 3. #général (read-only for players).
  let generalId = challenge.discordGeneralChannelId;
  if (!channelExists(generalId)) {
    const existing = bySlug(channels, 0, GENERAL_NAME);
    if (existing) {
      generalId = existing.id;
      out.skipped.push(`#${GENERAL_NAME}`);
    } else {
      const c = await createChannel(guildId, {
        name: GENERAL_NAME,
        type: 0,
        topic: "Annonces du défi lecture · classement du dimanche 20 h",
        permissionOverwrites: generalOverwrites({ guildId, adminRoleId, botId }),
      });
      await sleep(PACE);
      if (!c.ok) {
        out.errors.push(`#${GENERAL_NAME} : ${c.error}`);
        generalId = null;
      } else {
        generalId = c.data.id;
        channels.push(c.data);
        out.created.push(`#${GENERAL_NAME}`);
      }
    }
    if (generalId) await prisma.challenge.update({ where: { id: challengeId }, data: { discordGeneralChannelId: generalId } });
  } else {
    out.skipped.push(`#${GENERAL_NAME}`);
  }

  // --- 4. Per team: role, category, #aventure, #librairie.
  for (const team of teams) {
    try {
      // Role.
      let teamRoleId = team.discordRoleId;
      if (!roleExists(teamRoleId)) {
        const existing = roles.find((r) => r.name === team.name && !r.managed);
        if (existing) {
          teamRoleId = existing.id;
          out.skipped.push(`rôle ${team.name}`);
        } else {
          const r = await createRole(guildId, { name: team.name, color: hexToInt(team.color), hoist: true, mentionable: true });
          await sleep(PACE);
          if (!r.ok) throw new Error(`rôle : ${r.error}`);
          teamRoleId = r.data.id;
          roles.push(r.data);
          out.created.push(`rôle ${team.name}`);
        }
        await prisma.team.update({ where: { id: team.id }, data: { discordRoleId: teamRoleId } });
        team.discordRoleId = teamRoleId;
      } else {
        out.skipped.push(`rôle ${team.name}`);
      }

      const overwrites = teamOverwrites({ guildId, teamRoleId: teamRoleId!, adminRoleId, botId });

      // Category: rediscovered from the adventure channel's parent when possible.
      const known = channels.find((c) => c.id === team.discordChannelId);
      let categoryId = known?.parent_id ?? bySlug(channels, 4, team.name)?.id ?? null;
      if (!categoryId) {
        const c = await createChannel(guildId, { name: team.name, type: 4, permissionOverwrites: overwrites });
        await sleep(PACE);
        if (!c.ok) throw new Error(`catégorie : ${c.error}`);
        categoryId = c.data.id;
        channels.push(c.data);
        out.created.push(`catégorie ${team.name}`);
      } else if (!known) {
        out.skipped.push(`catégorie ${team.name}`);
      }

      // The two salons.
      const salons = [
        { name: ADVENTURE_NAME, field: "discordChannelId" as const, current: team.discordChannelId, topic: `Histoire, votes et annonces · ${team.name}` },
        { name: LIBRARY_NAME, field: "discordLibraryChannelId" as const, current: team.discordLibraryChannelId, topic: `/ajouter-un-livre et /modifier-un-livre · ${team.name}` },
      ];
      for (const salon of salons) {
        if (channelExists(salon.current)) {
          out.skipped.push(`#${salon.name} · ${team.name}`);
          continue;
        }
        const existing = bySlug(channels, 0, salon.name, categoryId);
        let id = existing?.id ?? null;
        if (existing) {
          out.skipped.push(`#${salon.name} · ${team.name}`);
        } else {
          const c = await createChannel(guildId, { name: salon.name, type: 0, parentId: categoryId, topic: salon.topic, permissionOverwrites: overwrites });
          await sleep(PACE);
          if (!c.ok) throw new Error(`#${salon.name} : ${c.error}`);
          id = c.data.id;
          channels.push(c.data);
          out.created.push(`#${salon.name} · ${team.name}`);
        }
        await prisma.team.update({ where: { id: team.id }, data: { [salon.field]: id } });
        team[salon.field] = id;
      }
    } catch (e) {
      out.errors.push(`${team.name} — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- 5. Slash commands (idempotent PUT).
  // A PUT replaces the whole list, so it is a sync, not a creation: counted as
  // « déjà en place » to keep a second run at « 0 créé ».
  const commands = await registerGuildCommands(botId, guildId, SLASH_COMMANDS);
  if (commands.ok) out.skipped.push(`${SLASH_COMMANDS.length} commandes slash`);
  else out.errors.push(`commandes : ${commands.error}`);
  // `/challenger` is application-wide (it must exist on servers with no
  // challenge), so it is synced here too rather than per guild.
  const global = await registerGlobalCommands(botId, GLOBAL_COMMANDS);
  if (global.ok) out.skipped.push("commande /challenger");
  else out.errors.push(`commande /challenger : ${global.error}`);

  // --- 6. Roles for the people already on the server.
  const assign = async (discordId: string | null, roleId: string | null, who: string) => {
    if (!discordId || !roleId) return;
    const r = await addMemberRole(guildId, discordId, roleId);
    await sleep(PACE);
    if (r.ok) out.rolesAssigned++;
    else if (r.status === 404) out.skipped.push(`${who} n'est pas sur le serveur`);
    else out.errors.push(`rôle de ${who} : ${r.error}`);
  };
  for (const a of admins) await assign(a.discordId, adminRoleId, a.name ?? "un·e organisateur·ice");
  for (const team of teams) {
    for (const m of team.members) await assign(m.user.discordId, team.discordRoleId, m.user.name ?? "un·e joueur·euse");
  }

  // --- 7. Kyle's pinned welcome (once per salon, via BotEvent).
  for (const team of teams) {
    if (await postWelcome(team)) out.welcomed++;
  }

  return out;
}

type WelcomeTeam = {
  id: string;
  challengeId: string;
  name: string;
  color: string;
  discordChannelId: string | null;
  discordLibraryChannelId: string | null;
  discordGuideMessageId: string | null;
};

/**
 * Posts and pins Kyle's welcome in the team salons: the *aventure* one is
 * posted once (`BotEvent`), the *librairie* one is the guide card, whose
 * idempotency mark is `Team.discordGuideMessageId` — an organiser can refresh
 * it at will from Admin › Équipes.
 */
export async function postWelcome(team: WelcomeTeam): Promise<boolean> {
  const color = hexToInt(team.color);
  let posted = false;

  if (team.discordChannelId) {
    const channelId = team.discordChannelId;
    posted =
      (await once(`welcome:${team.id}:${channelId}`, async () => {
        const embed = welcomeMessage(team);
        const id = await postMessage(channelId, { embeds: [{ ...embed, color }] });
        if (id) await pinMessage(channelId, id);
      })) || posted;
  }
  if (team.discordLibraryChannelId && !team.discordGuideMessageId) {
    // Best-effort like the rest of the bootstrap: a Discord hiccup must not
    // abort the setup, the organiser can retry with « Publier le guide ».
    try {
      await publishTeamGuide(team.challengeId, team.id);
      posted = true;
    } catch (e) {
      console.error(`[discord] guide de ${team.name}`, e);
    }
  }
  return posted;
}

/**
 * Aligns one member's Discord roles on one challenge's server: their team role,
 * plus « Organisateurs » when they organise that edition. Best-effort — never
 * throws, so a login or a team change is never blocked by Discord.
 * Called from `auth.ts` (login, via `after()`) and the admin players page.
 */
export async function syncMemberRoles(userId: string, challengeId: string): Promise<void> {
  try {
    if (!process.env.DISCORD_BOT_TOKEN) return;
    const [user, challengeMember] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } }),
      prisma.challengeMember.findUnique({ where: { challengeId_userId: { challengeId, userId } }, select: { role: true } }),
    ]);
    if (!user?.discordId) return;

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge?.discordGuildId) return;
    const guildId = challenge.discordGuildId;

    const membership = await prisma.teamMember.findUnique({ where: { userId_challengeId: { userId, challengeId } }, select: { teamId: true } });
    const teams = await prisma.team.findMany({ where: { challengeId }, select: { id: true, discordRoleId: true } });
    const managed = new Set([challenge.discordAdminRoleId, ...teams.map((t) => t.discordRoleId)].filter((x): x is string => !!x));
    const want = new Set<string>();
    const mine = teams.find((t) => t.id === membership?.teamId);
    if (mine?.discordRoleId) want.add(mine.discordRoleId);
    if (challengeMember?.role === "ORGANIZER" && challenge.discordAdminRoleId) want.add(challenge.discordAdminRoleId);
    if (managed.size === 0) return;

    const member = await getGuildMember(guildId, user.discordId);
    if (!member.ok) return; // not on the server (yet)
    const have = new Set(member.data.roles ?? []);

    for (const roleId of want) if (!have.has(roleId)) await addMemberRole(guildId, user.discordId, roleId);
    for (const roleId of managed) if (!want.has(roleId) && have.has(roleId)) await removeMemberRole(guildId, user.discordId, roleId);
  } catch (e) {
    console.error("[discord] syncMemberRoles", e);
  }
}
