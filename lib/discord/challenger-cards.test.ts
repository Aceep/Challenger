import { describe, expect, it } from "vitest";
import { challengeAdminUrl, challengeCreatingCard, challengeFailedCard, challengeReadyCard, type ChallengeSetupSummary } from "./challenger-cards";

const APP = "https://challenger.example";
const EMPTY: ChallengeSetupSummary = { created: [], skipped: [], errors: [] };

const ready = (over: Partial<Parameters<typeof challengeReadyCard>[0]> = {}) =>
  challengeReadyCard({
    name: "Le défi de l’hiver",
    startAt: new Date("2026-01-05T00:00:00.000Z"),
    endAt: new Date("2026-03-02T00:00:00.000Z"),
    teams: [{ name: "Les Renards" }, { name: "Les Hérissons" }],
    summary: EMPTY,
    appUrl: APP,
    pendingLogin: false,
    ...over,
  });

/** Discord's own limits: an embed over them is refused whole. */
const within = (embed: { title?: string; description?: string }) => {
  expect((embed.title ?? "").length).toBeLessThanOrEqual(256);
  expect((embed.description ?? "").length).toBeLessThanOrEqual(4096);
};

describe("carte « je prépare »", () => {
  it("nomme le défi et annonce le délai", () => {
    const c = challengeCreatingCard("Le défi de l’hiver");
    within(c);
    expect(c.title).toContain("Le défi de l’hiver");
    expect(c.description).toMatch(/minute/);
  });

  it("tient même sur un nom de cent caractères", () => {
    within(challengeCreatingCard("x".repeat(100)));
  });
});

describe("carte « tout est prêt »", () => {
  it("dit ce qui a été créé, avec les dates et les équipes", () => {
    const c = ready();
    within(c);
    expect(c.title).toContain("Le défi de l’hiver");
    // Même année des deux côtés : elle ne s'écrit qu'une fois.
    expect(c.description).toContain("du 5 janvier au 2 mars 2026");
    expect(c.description).toContain("Les Renards, Les Hérissons");
    expect(c.description).toContain("#annonces-défi");
    expect(c.description).toContain("#faq");
  });

  it("renvoie vers les réglages, le guide et l'invitation des joueur·euses", () => {
    const c = ready();
    expect(c.description).toContain(`${APP}/admin/challenge?tour=admin&step=0`);
    expect(c.description).toContain(`${APP}/guide`);
    expect(c.description).toMatch(/Joueurs/);
  });

  it("passe par la connexion quand la personne n'a pas encore de compte", () => {
    const c = ready({ pendingLogin: true });
    expect(c.description).toContain(`${APP}/login?callbackUrl=`);
    expect(c.description).not.toContain(`${APP}/admin/challenge`);
    // Le retour est bien la page d'administration, encodée.
    expect(challengeAdminUrl(APP, true)).toBe(`${APP}/login?callbackUrl=${encodeURIComponent("/admin/challenge?tour=admin&step=0")}`);
  });

  it("avoue les échecs partiels et dit comment reprendre", () => {
    const c = ready({ summary: { created: [], skipped: [], errors: ["#librairie · Les Renards : 403"] } });
    within(c);
    expect(c.description).toContain("#librairie · Les Renards");
    expect(c.description).toMatch(/rien ne sera dupliqué/);
  });

  it("écrit les deux années quand le défi passe le nouvel an", () => {
    const c = ready({ startAt: new Date("2026-12-07T00:00:00.000Z"), endAt: new Date("2027-02-01T00:00:00.000Z") });
    expect(c.description).toContain("du 7 décembre 2026 au 1 février 2027");
  });

  it("reste sous les limites avec douze équipes et des erreurs partout", () => {
    const teams = Array.from({ length: 12 }, (_, i) => ({ name: `Une équipe au nom vraiment très long numéro ${i + 1}` }));
    within(ready({ teams, summary: { created: [], skipped: [], errors: Array.from({ length: 30 }, (_, i) => `erreur ${i}`.repeat(20)) } }));
  });
});

describe("carte d'échec", () => {
  it("reprend le message d'erreur et propose de retaper la commande", () => {
    const c = challengeFailedCard("Un défi actif utilise déjà ce serveur Discord", APP);
    within(c);
    expect(c.description).toContain("Un défi actif utilise déjà ce serveur Discord");
    expect(c.description).toContain("/challenger creer");
    expect(c.description).toContain(`${APP}/guide`);
  });

  it("a toujours quelque chose à dire, même sans message", () => {
    expect(challengeFailedCard("   ", APP).description).toMatch(/Discord n’a pas répondu/);
  });
});
