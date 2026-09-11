import { describe, expect, it } from "vitest";
import { inviteDmMessage } from "./invite-dm";

const APP = "https://challenger.test";

const base = { challengeName: "Défi d’automne", teamName: "Les Hérissons", guildName: "Les Grands Lecteurs", appUrl: APP };

describe("message privé d'invitation", () => {
  it("dit à quel défi on est invité·e, et par où commencer", () => {
    const [embed] = inviteDmMessage(base).embeds!;
    expect(embed.title).toContain("Défi d’automne");
    expect(embed.description).toContain(`${APP}/login`);
    expect(embed.description).toContain("Les Hérissons");
    expect(embed.description).toContain("Les Grands Lecteurs");
    expect(embed.description).toContain(`${APP}/guide#joueur`);
  });

  it("annonce que l'équipe viendra plus tard quand l'invitation n'en fixe aucune", () => {
    const [embed] = inviteDmMessage({ ...base, teamName: null }).embeds!;
    expect(embed.description).toContain("équipe te sera attribuée");
    expect(embed.description).not.toContain("Les Hérissons");
  });

  it("reste lisible sans le nom du serveur", () => {
    const [embed] = inviteDmMessage({ ...base, guildName: null }).embeds!;
    expect(embed.description).not.toContain("défi lecture de");
    expect(embed.description).toContain("Kyle");
  });

  it("dit que les salons arrivent à la connexion", () => {
    const [embed] = inviteDmMessage(base).embeds!;
    expect(embed.description).toContain("salons");
  });

  it("tient dans les limites d'un embed Discord, même avec des noms démesurés", () => {
    const [embed] = inviteDmMessage({ ...base, challengeName: "N".repeat(400), teamName: "É".repeat(400) }).embeds!;
    expect(embed.title!.length).toBeLessThanOrEqual(256);
    expect(embed.description!.length).toBeLessThanOrEqual(4096);
  });

  it("applique la typographie française (espaces insécables)", () => {
    const [embed] = inviteDmMessage(base).embeds!;
    expect(embed.description).toContain("« Défi d’automne »");
  });
});
