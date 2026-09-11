import { describe, expect, it } from "vitest";
import { allDone, nextSteps, type NextStepsChallenge, type NextStepsCounts } from "./next-steps";

const EMPTY: NextStepsChallenge = {
  discordGuildId: null,
  discordAdminRoleId: null,
  discordCategoryId: null,
  discordGeneralChannelId: null,
  discordFaqChannelId: null,
};

/** A server Kyle has fully wired: role, category, announcements salon and forum. */
const WIRED: NextStepsChallenge = {
  discordGuildId: "123",
  discordAdminRoleId: "456",
  discordCategoryId: "789",
  discordGeneralChannelId: "790",
  discordFaqChannelId: "791",
};

const NOBODY: NextStepsCounts = { teams: 0, teamsReady: 0, players: 0, pendingInvites: 0 };

const doneIds = (c: NextStepsChallenge, counts: NextStepsCounts) =>
  nextSteps(c, counts)
    .filter((s) => s.done)
    .map((s) => s.id);

describe("prochaines étapes d'un défi", () => {
  it("ne coche que « Défi créé » sur un défi neuf", () => {
    const steps = nextSteps(EMPTY, NOBODY);
    expect(steps).toHaveLength(5);
    expect(steps.filter((s) => s.done)).toHaveLength(1);
    expect(steps[0].id).toBe("created");
    expect(allDone(steps)).toBe(false);
  });

  it("coche le serveur dès que son identifiant est renseigné", () => {
    expect(doneIds({ ...EMPTY, discordGuildId: "123" }, NOBODY)).toEqual(["created", "guild"]);
  });

  it("n'annonce Kyle installé que si tout ce qu'il crée est là", () => {
    // Chaque pièce manquante, une par une, laisse l'étape ouverte.
    for (const missing of ["discordAdminRoleId", "discordCategoryId", "discordGeneralChannelId", "discordFaqChannelId"] as const) {
      expect(doneIds({ ...WIRED, [missing]: null }, NOBODY), missing).toEqual(["created", "guild"]);
    }
    expect(doneIds(WIRED, NOBODY)).toEqual(["created", "guild", "bot"]);
  });

  it("ne coche les équipes que lorsqu'elles sont toutes câblées, et le dit", () => {
    const half = nextSteps(WIRED, { ...NOBODY, teams: 3, teamsReady: 2 });
    const teams = half.find((s) => s.id === "teams")!;
    expect(teams.done).toBe(false);
    expect(teams.detail).toBe("3 équipes, 2 câblées sur Discord");
    expect(teams.hint).toBeTruthy();
    expect(nextSteps(WIRED, { ...NOBODY, teams: 3, teamsReady: 3 }).find((s) => s.id === "teams")!.done).toBe(true);
  });

  it("compte une invitation en attente comme un·e joueur·euse invité·e", () => {
    const steps = nextSteps(WIRED, { teams: 2, teamsReady: 2, players: 0, pendingInvites: 4 });
    expect(allDone(steps)).toBe(true);
    expect(steps.find((s) => s.id === "players")!.detail).toBe("4 invitations en attente");
  });

  it("coche tout et disparaît une fois la configuration terminée", () => {
    expect(allDone(nextSteps(WIRED, { teams: 4, teamsReady: 4, players: 12, pendingInvites: 0 }))).toBe(true);
  });

  it("donne un lien à chaque étape restant à faire", () => {
    for (const step of nextSteps(EMPTY, NOBODY)) {
      if (step.id !== "created") expect(step.href, step.id).toBeTruthy();
    }
  });
});
