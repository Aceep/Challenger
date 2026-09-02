import { describe, expect, it } from "vitest";
import { EMBED_LIMIT, helpSections, helpText, welcomeMessage } from "./help";

const TEAM = { name: "Les Hérissons", discordChannelId: "111", discordLibraryChannelId: "222" };

describe("aide et messages d'accueil", () => {
  it("mentionne les salons quand on connaît leurs identifiants", () => {
    const text = helpText(TEAM);
    expect(text).toContain("<#222>");
    expect(text).toContain("<#111>");
  });

  it("retombe sur des noms lisibles sans salon", () => {
    const text = helpText(null);
    expect(text).not.toContain("<#");
    expect(text).toContain("librairie");
  });

  it("annonce le bouton dans la section Lectures", () => {
    const lectures = helpSections({ library: "#librairie", adventure: "#aventure" })[0];
    expect(lectures.title).toContain("Lectures");
    expect(lectures.lines[0]).toContain("«\u00a0J’ai fini un livre\u00a0»");
    expect(lectures.lines[0]).toContain("#librairie");
  });

  it("dit que l'on entre dans un défi sur invitation, sans commande pour rejoindre", () => {
    const text = helpText(null);
    expect(text).toContain("/challenger creer");
    expect(text).not.toContain("/challenger rejoindre");
    expect(text).toContain("invitation");
  });

  it("garde les sections d'aide non vides", () => {
    const sections = helpSections({ library: "#librairie", adventure: "#aventure" });
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) expect(s.lines.length).toBeGreaterThan(0);
  });

  it("tient dans un embed Discord et explique la première commande", () => {
    const m = welcomeMessage(TEAM);
    expect(m.title).toContain("Les Hérissons");
    expect(m.description.length).toBeLessThanOrEqual(4096);
    expect(m.description).toContain("/ajouter-un-livre");
    expect(m.description).toContain("J\u2019ai fini un livre");
    expect(m.description).toContain("<#222>");
  });

  it("reste valide pour une équipe sans salons", () => {
    const m = welcomeMessage({ name: "Kyle", discordChannelId: null, discordLibraryChannelId: null });
    expect(m.description.length).toBeLessThanOrEqual(4096);
    expect(m.description).not.toContain("<#");
  });

  it("tient dans un embed Discord (l’aide dépasse les 2 000 caractères d’un message)", () => {
    expect(helpText(TEAM).length).toBeLessThanOrEqual(EMBED_LIMIT);
    expect(helpText(null).length).toBeLessThanOrEqual(EMBED_LIMIT);
  });
});
