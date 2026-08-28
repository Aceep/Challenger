import { describe, expect, it } from "vitest";
import {
  botInviteUrl,
  compareSnowflakes,
  mapDiscordMessages,
  nextStatus,
  parseFaqTags,
  questionPostContent,
  replyContent,
  tagsFor,
  threadUrl,
  type RawDiscordMessage,
} from "./faq";

const TAGS = { open: "t-open", answered: "t-answered", resolved: "t-resolved" };
const BOT = "app-1";
const users = new Map([
  ["d-admin", { id: "u-orga", role: "ORGANIZER" as const }],
  ["d-lea", { id: "u-lea", role: "PLAYER" as const }],
]);
const msg = (id: string, authorId: string, content: string, extra: Partial<RawDiscordMessage["author"]> & { type?: number } = {}): RawDiscordMessage => ({
  id,
  content,
  type: extra.type ?? 0,
  author: { id: authorId, username: "user", ...extra },
});

describe("contenu publié dans le forum", () => {
  it("mentionne l'auteur et le rôle des organisateurs", () => {
    expect(questionPostContent({ authorDiscordId: "d-lea", roleId: "r-1", body: "Les mangas comptent ?" })).toBe(
      "❓ **Question de <@d-lea>** <@&r-1>\n\nLes mangas comptent ?",
    );
  });
  it("se passe du rôle et du détail quand ils manquent", () => {
    expect(questionPostContent({ authorDiscordId: "d-lea", roleId: null, body: "   " })).toBe("❓ **Question de <@d-lea>**");
  });
  it("distingue une réponse d'organisation, qui interpelle l'auteur", () => {
    expect(replyContent({ name: "Alycia", isAdmin: true, mentionUserId: "d-lea", body: "Oui !" })).toBe("✅ **Alycia** · organisation → <@d-lea>\n\nOui !");
    expect(replyContent({ name: "Léa", isAdmin: false, body: "Merci" })).toBe("💬 **Léa**\n\nMerci");
  });
  it("construit les liens Discord et le lien d'invitation du bot", () => {
    expect(threadUrl("g-1", "th-1")).toBe("https://discord.com/channels/g-1/th-1");
    expect(threadUrl(null, "th-1")).toBeNull();
    expect(botInviteUrl("app-1")).toContain("permissions=268453904");
    expect(botInviteUrl(null)).toBeNull();
  });
});

describe("statuts et étiquettes", () => {
  it("passe d'Ouverte à Répondue dès qu'un·e admin répond", () => {
    expect(nextStatus("OPEN", { adminReplied: true })).toBe("ANSWERED");
    expect(nextStatus("OPEN", { adminReplied: false })).toBe("OPEN");
    expect(nextStatus("ANSWERED", { adminReplied: false })).toBe("ANSWERED");
  });
  it("ne ressuscite jamais une question résolue", () => {
    expect(nextStatus("RESOLVED", { adminReplied: true })).toBe("RESOLVED");
  });
  it("associe une seule étiquette par statut, aucune si le forum n'en a pas", () => {
    expect(tagsFor("OPEN", TAGS)).toEqual(["t-open"]);
    expect(tagsFor("ANSWERED", TAGS)).toEqual(["t-answered"]);
    expect(tagsFor("RESOLVED", TAGS)).toEqual(["t-resolved"]);
    expect(tagsFor("OPEN", null)).toEqual([]);
  });
  it("relit la colonne Json en refusant les formes incomplètes", () => {
    expect(parseFaqTags(TAGS)).toEqual(TAGS);
    expect(parseFaqTags({ open: "a", answered: "b" })).toBeNull();
    expect(parseFaqTags(null)).toBeNull();
  });
});

describe("mapDiscordMessages", () => {
  it("trie par identifiant croissant, même quand Discord renvoie l'inverse", () => {
    expect(compareSnowflakes("99", "100")).toBeLessThan(0);
    const { messages, lastMessageId } = mapDiscordMessages([msg("100", "d-lea", "deux"), msg("99", "d-lea", "un")], { botAppId: BOT, knownUsers: users });
    expect(messages.map((m) => m.body)).toEqual(["un", "deux"]);
    expect(lastMessageId).toBe("100");
  });

  it("ignore le bot et les autres robots, mais avance quand même le curseur", () => {
    const { messages, lastMessageId } = mapDiscordMessages(
      [msg("1", "d-lea", "vraie question"), msg("2", BOT, "message du bot"), msg("3", "d-autre", "spam", { bot: true })],
      { botAppId: BOT, knownUsers: users },
    );
    expect(messages).toHaveLength(1);
    expect(lastMessageId).toBe("3");
  });

  it("marque les réponses des admins et rattache les comptes connus", () => {
    const { messages } = mapDiscordMessages([msg("1", "d-admin", "Oui, ça compte."), msg("2", "d-lea", "Merci !")], { botAppId: BOT, knownUsers: users });
    expect(messages[0]).toMatchObject({ authorId: "u-orga", isAdmin: true, discordUserId: "d-admin" });
    expect(messages[1]).toMatchObject({ authorId: "u-lea", isAdmin: false });
  });

  it("garde les inconnus de Discord sous leur pseudo, sans compte lié", () => {
    const { messages } = mapDiscordMessages([msg("1", "d-inconnu", "coucou", { global_name: "Bibliothécaire" })], { botAppId: BOT, knownUsers: users });
    expect(messages[0]).toMatchObject({ authorId: null, discordUserName: "Bibliothécaire", isAdmin: false });
  });

  it("laisse de côté les messages vides, systèmes et déjà importés", () => {
    const { messages } = mapDiscordMessages(
      [msg("1", "d-lea", "   "), msg("2", "d-lea", "arrivée", { type: 7 }), msg("3", "d-lea", "déjà là"), msg("4", "d-lea", "neuf")],
      { botAppId: BOT, knownUsers: users, knownMessageIds: new Set(["3"]) },
    );
    expect(messages.map((m) => m.body)).toEqual(["neuf"]);
  });

  it("ne renvoie aucun curseur quand la page est vide", () => {
    expect(mapDiscordMessages([], { botAppId: BOT, knownUsers: users })).toEqual({ messages: [], lastMessageId: null });
  });
});
