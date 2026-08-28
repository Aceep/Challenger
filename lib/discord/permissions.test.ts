import { describe, expect, it } from "vitest";
import {
  BOT_ALLOW,
  BOT_INVITE_PERMISSIONS,
  MEMBER_ALLOW,
  P,
  botInviteUrl,
  channelSlug,
  discordSetupState,
  generalOverwrites,
  hexToInt,
  sum,
  teamDiscordReady,
  teamOverwrites,
} from "./permissions";

const GUILD = "100";
const TEAM_ROLE = "200";
const ADMIN_ROLE = "300";
const BOT = "400";

describe("permissions Discord", () => {
  it("additionne les bits sans déborder sur 32 bits", () => {
    expect(P.USE_APP_COMMANDS).toBe(2147483648);
    expect(sum(P.VIEW, P.SEND)).toBe("3072");
    expect(BOT_INVITE_PERMISSIONS).toBe("268528656");
    expect(MEMBER_ALLOW).toBe("2147601472");
    expect(BOT_ALLOW).toBe("93184");
  });

  it("construit le lien d'invitation du bot", () => {
    const url = new URL(botInviteUrl("app-1"));
    expect(url.origin + url.pathname).toBe("https://discord.com/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("app-1");
    expect(url.searchParams.get("scope")).toBe("bot applications.commands");
    expect(url.searchParams.get("permissions")).toBe(BOT_INVITE_PERMISSIONS);
    expect(url.searchParams.get("guild_id")).toBeNull();

    const pinned = new URL(botInviteUrl("app-1", "guild-9"));
    expect(pinned.searchParams.get("guild_id")).toBe("guild-9");
    expect(pinned.searchParams.get("disable_guild_select")).toBe("true");
  });

  it("rend un salon d'équipe privé : @everyone ne le voit pas", () => {
    const ow = teamOverwrites({ guildId: GUILD, teamRoleId: TEAM_ROLE, adminRoleId: ADMIN_ROLE, botId: BOT });
    const everyone = ow.find((o) => o.id === GUILD)!;
    expect(everyone.deny).toBe(sum(P.VIEW));
    expect(everyone.allow).toBe("0");
    expect(ow.find((o) => o.id === TEAM_ROLE)!.allow).toBe(MEMBER_ALLOW);
    expect(ow.find((o) => o.id === ADMIN_ROLE)!.allow).toBe(MEMBER_ALLOW);
    const bot = ow.find((o) => o.id === BOT)!;
    expect(bot.type).toBe(1);
    expect(bot.allow).toBe(BOT_ALLOW);
  });

  it("omet les entrées inconnues quand le rôle admin ou le bot manquent", () => {
    expect(teamOverwrites({ guildId: GUILD, teamRoleId: TEAM_ROLE })).toHaveLength(2);
  });

  it("rend #général lisible par tous mais accessible en écriture aux seuls organisateurs", () => {
    const ow = generalOverwrites({ guildId: GUILD, adminRoleId: ADMIN_ROLE, botId: BOT });
    const everyone = ow.find((o) => o.id === GUILD)!;
    expect(everyone.allow).toBe(sum(P.VIEW, P.HISTORY, P.ADD_REACTIONS));
    expect(everyone.deny).toBe(sum(P.SEND));
    expect(ow.find((o) => o.id === ADMIN_ROLE)!.allow).toBe(sum(P.SEND, P.EMBED, P.ATTACH));
  });

  it("transforme un nom d'équipe en nom de salon", () => {
    expect(channelSlug("Les Hérissons")).toBe("les-herissons");
    expect(channelSlug("  Équipe #1 — Les Œufs  ")).toBe("equipe-1-les-ufs");
    expect(channelSlug("🙂")).toBe("salon");
  });

  it("convertit une couleur hexadécimale", () => {
    expect(hexToInt("#6366f1")).toBe(0x6366f1);
    expect(hexToInt("6366F1")).toBe(0x6366f1);
    expect(hexToInt(null)).toBe(0);
    expect(hexToInt("rouge")).toBe(0);
  });

  it("résume l'état de la configuration du serveur", () => {
    const ready = { discordRoleId: "r", discordChannelId: "a", discordLibraryChannelId: "l" };
    const partial = { discordRoleId: "r", discordChannelId: "a", discordLibraryChannelId: null };
    expect(teamDiscordReady(ready)).toBe(true);
    expect(teamDiscordReady(partial)).toBe(false);

    expect(discordSetupState(null, [])).toMatchObject({ guildId: null, teamsReady: 0, teamsTotal: 0, complete: false });

    const challenge = { discordGuildId: "g", discordAdminRoleId: "ar", discordGeneralChannelId: "gc" };
    expect(discordSetupState(challenge, [ready, partial])).toMatchObject({ teamsReady: 1, teamsTotal: 2, complete: false });
    expect(discordSetupState(challenge, [ready, ready]).complete).toBe(true);
    expect(discordSetupState({ ...challenge, discordGeneralChannelId: null }, [ready]).complete).toBe(false);
  });
});
