import { describe, expect, it } from "vitest";
import { installWelcomeMessage, WELCOME_COLOR, WELCOME_GUILD_KEY } from "./welcome";

const APP = "https://challenger.example";
const embed = (existing: { name: string } | null, guildName = "Les Liseuses") =>
  installWelcomeMessage({ guildName, appUrl: APP, existing }).embeds![0];

describe("clé d'idempotence", () => {
  it("est propre au couple (serveur, destinataire)", () => {
    expect(WELCOME_GUILD_KEY("g1", "u1")).toBe("welcome-install:g1:u1");
    expect(WELCOME_GUILD_KEY("g1", "u2")).not.toBe(WELCOME_GUILD_KEY("g1", "u1"));
    expect(WELCOME_GUILD_KEY("g2", "u1")).not.toBe(WELCOME_GUILD_KEY("g1", "u1"));
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
    for (const e of [embed(null), embed({ name: "Défi 2026" })]) {
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
