import { describe, expect, it } from "vitest";
import {
  BOT_ALLOW,
  BOT_PERMISSIONS,
  MEMBER_ALLOW,
  P,
  botInviteUrl,
  channelSlug,
  discordSetupState,
  announcementsOverwrites,
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
    expect(MEMBER_ALLOW).toBe("2147601472");
    expect(BOT_ALLOW).toBe("93184");
  });

  it("demande un seul jeu de permissions, fils du forum compris", () => {
    // Ancien lien d'invitation (268528656) + ancien jeu FAQ (268453904, qui en
    // était un sous-ensemble) + les deux bits de fil, sans lesquels Kyle ne peut
    // ni ouvrir un sujet ni y répondre.
    expect(BOT_PERMISSIONS).toBe("309506173968");
    const bits = BigInt(BOT_PERMISSIONS);
    expect(bits & BigInt("268528656")).toBe(BigInt("268528656"));
    expect(bits & BigInt("268453904")).toBe(BigInt("268453904"));
    expect(bits & BigInt(P.CREATE_PUBLIC_THREADS)).not.toBe(BigInt(0));
    expect(bits & BigInt(P.SEND_IN_THREADS)).not.toBe(BigInt(0));
    // Jamais « Administrateur » : on demande le nécessaire, pas les pleins pouvoirs.
    expect(bits & BigInt(P.ADMINISTRATOR)).toBe(BigInt(0));
  });

  it("construit le lien d'invitation du bot", () => {
    const url = new URL(botInviteUrl("app-1"));
    expect(url.origin + url.pathname).toBe("https://discord.com/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("app-1");
    expect(url.searchParams.get("scope")).toBe("bot applications.commands");
    expect(url.searchParams.get("permissions")).toBe(BOT_PERMISSIONS);
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

  it("rend #annonces-défi lisible par tous mais accessible en écriture aux seuls organisateurs", () => {
    const ow = announcementsOverwrites({ guildId: GUILD, adminRoleId: ADMIN_ROLE, botId: BOT });
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

    expect(discordSetupState(null, [])).toMatchObject({ guildId: null, categoryId: null, faqChannelId: null, teamsReady: 0, teamsTotal: 0, complete: false });

    const challenge = { discordGuildId: "g", discordAdminRoleId: "ar", discordCategoryId: "cat", discordGeneralChannelId: "gc", discordFaqChannelId: "faq" };
    expect(discordSetupState(challenge, [ready, partial])).toMatchObject({ teamsReady: 1, teamsTotal: 2, complete: false });
    expect(discordSetupState(challenge, [ready, ready]).complete).toBe(true);
    // Tout ce que crée le bootstrap est exigé : il en manque une pièce, ce n'est pas fini.
    for (const missing of ["discordAdminRoleId", "discordCategoryId", "discordGeneralChannelId", "discordFaqChannelId"] as const) {
      expect(discordSetupState({ ...challenge, [missing]: null }, [ready]).complete, missing).toBe(false);
    }
  });
});
