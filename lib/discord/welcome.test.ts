import { describe, expect, it } from "vitest";
import { installWelcomeMessage, WELCOME_CHANNEL_KEY, WELCOME_COLOR, WELCOME_GUILD_KEY, type WelcomeAudience } from "./welcome";

const APP = "https://challenger.example";
const embed = (existing: { name: string } | null, guildName = "Les Liseuses", audience: WelcomeAudience = "dm") =>
  installWelcomeMessage({ guildName, appUrl: APP, existing }, audience).embeds![0];

describe("clé d'idempotence", () => {
  it("est propre au couple (serveur, destinataire)", () => {
    expect(WELCOME_GUILD_KEY("g1", "u1")).toBe("welcome-install:g1:u1");
    expect(WELCOME_GUILD_KEY("g1", "u2")).not.toBe(WELCOME_GUILD_KEY("g1", "u1"));
    expect(WELCOME_GUILD_KEY("g2", "u1")).not.toBe(WELCOME_GUILD_KEY("g1", "u1"));
  });

  it("ne poste le repli en salon qu'une fois par serveur", () => {
    expect(WELCOME_CHANNEL_KEY("g1")).toBe("welcome-install-channel:g1");
    expect(WELCOME_CHANNEL_KEY("g2")).not.toBe(WELCOME_CHANNEL_KEY("g1"));
    // Jamais la même clé que le MP : un MP refusé doit pouvoir déclencher le salon.
    expect(WELCOME_CHANNEL_KEY("g1")).not.toBe(WELCOME_GUILD_KEY("g1", "u1"));
  });
});

describe("message d'installation", () => {
  it("titre le serveur, avec la typographie française et la couleur du bot", () => {
    const e = embed(null);
    expect(e.title).toContain("Les Liseuses");
    // Guillemets collés par une espace insécable.
    expect(e.title).toContain("« Les Liseuses »");
    expect(e.color).toBe(WELCOME_COLOR);
  });

  it("tient dans la limite d'une description d'embed", () => {
    for (const e of [embed(null), embed({ name: "Défi 2026" }), embed(null, "Les Liseuses", "channel"), embed({ name: "Défi 2026" }, "Les Liseuses", "channel")]) {
      expect(e.description!.length).toBeLessThanOrEqual(4096);
      expect(e.description!.length).toBeGreaterThan(0);
    }
  });

  it("sans défi : donne les trois étapes, à commencer par /challenger creer", () => {
    const d = embed(null).description!;
    expect(d).toContain("/challenger creer");
    // Les joueur·euses entrent par invitation, plus par une commande Discord.
    expect(d).not.toContain("rejoindre");
    expect(d).toContain("invitation");
    expect(d).toContain("Gérer le serveur");
    expect(d).toContain("Configurer le serveur Discord");
    expect(d).toContain(APP);
    // Les trois étapes, dans l'ordre.
    expect(d.indexOf("**1.")).toBeGreaterThan(-1);
    expect(d.indexOf("**2.")).toBeGreaterThan(d.indexOf("**1."));
    expect(d.indexOf("**3.")).toBeGreaterThan(d.indexOf("**2."));
  });

  it("renvoie vers le guide de l'organisateur·ice", () => {
    expect(embed(null).description).toContain(`${APP}/guide`);
    expect(embed({ name: "Défi 2026" }).description).toContain(`${APP}/guide`);
    expect(embed(null, "Les Liseuses", "channel").description).toContain(`${APP}/guide`);
  });

  it("en salon : parle du serveur, pas à la personne qui a installé l'app", () => {
    const d = embed(null, "Les Liseuses", "channel").description!;
    expect(d).toContain("Un·e admin peut lancer le défi");
    expect(d).toContain("/challenger creer");
    // La variante salon ne tutoie personne en particulier : elle est lue par tout le monde.
    expect(d).not.toContain("Tape `/challenger creer`");
  });

  it("prévient que /challenger peut mettre une heure à apparaître", () => {
    expect(embed(null).description).toContain("une heure");
    expect(embed({ name: "Défi 2026" }).description).toContain("une heure");
  });

  it("avec un défi : ne propose plus d'en créer un, mais l'invitation ou le pilotage", () => {
    const d = embed({ name: "Défi 2026" }).description!;
    expect(d).toContain("Défi 2026");
    expect(d).toContain("invitation");
    expect(d).toContain(`${APP}/admin/challenge`);
    expect(d).not.toContain("/challenger creer");
  });
});
