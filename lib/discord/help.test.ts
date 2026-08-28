import { describe, expect, it } from "vitest";
import { helpSections, helpText, libraryWelcomeMessage, welcomeMessage } from "./help";

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
    expect(m.description).toContain("<#222>");
  });

  it("reste valide pour une équipe sans salons", () => {
    const m = welcomeMessage({ name: "Kyle", discordChannelId: null, discordLibraryChannelId: null });
    expect(m.description.length).toBeLessThanOrEqual(4096);
    expect(m.description).not.toContain("<#");
  });

  it("rappelle les commandes dans la librairie", () => {
    const m = libraryWelcomeMessage(TEAM);
    expect(m.description).toContain("/ajouter-un-livre");
    expect(m.description.length).toBeLessThanOrEqual(4096);
  });
});
