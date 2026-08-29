import { describe, expect, it } from "vitest";
import { allDone, nextSteps } from "./next-steps";

const EMPTY = { discordGuildId: null, discordAdminRoleId: null, discordGeneralChannelId: null };
const doneIds = (c: typeof EMPTY, counts: { teams: number; players: number }) =>
  nextSteps(c, counts)
    .filter((s) => s.done)
    .map((s) => s.id);

describe("prochaines étapes d'un défi", () => {
  it("ne coche que « Défi créé » sur un défi neuf", () => {
    const steps = nextSteps(EMPTY, { teams: 0, players: 0 });
    expect(steps).toHaveLength(5);
    expect(steps.filter((s) => s.done)).toHaveLength(1);
    expect(steps[0].id).toBe("created");
    expect(allDone(steps)).toBe(false);
  });

  it("coche le serveur dès que son identifiant est renseigné", () => {
    expect(doneIds({ ...EMPTY, discordGuildId: "123" }, { teams: 0, players: 0 })).toEqual(["created", "guild"]);
  });

  it("ne coche la configuration que si le rôle et le salon général existent", () => {
    const half = { discordGuildId: "123", discordAdminRoleId: "456", discordGeneralChannelId: null };
    expect(doneIds(half, { teams: 0, players: 0 })).toEqual(["created", "guild"]);
    expect(doneIds({ ...half, discordGeneralChannelId: "789" }, { teams: 0, players: 0 })).toEqual(["created", "guild", "bot"]);
  });

  it("coche tout et disparaît une fois la configuration terminée", () => {
    const steps = nextSteps({ discordGuildId: "123", discordAdminRoleId: "456", discordGeneralChannelId: "789" }, { teams: 4, players: 12 });
    expect(allDone(steps)).toBe(true);
  });

  it("donne un lien à chaque étape restant à faire", () => {
    for (const step of nextSteps(EMPTY, { teams: 0, players: 0 })) {
      if (step.id !== "created") expect(step.href, step.id).toBeTruthy();
    }
  });
});
