/**
 * « Prochaines étapes » of a freshly created challenge — pure, no I/O.
 *
 * Someone who just created their edition lands on Admin › Défi with a lot of
 * cards and no idea which one comes first. This turns the state of the edition
 * into an ordered checklist; once everything is done the card disappears.
 */

export type NextStepId = "created" | "guild" | "bot" | "teams" | "players";

export type NextStep = {
  id: NextStepId;
  label: string;
  done: boolean;
  /** Where the « Ouvrir » button of an unfinished step goes. */
  href?: string;
  /** Second line, when the step has an alternative worth knowing. */
  hint?: string;
};

export type NextStepsChallenge = {
  discordGuildId: string | null;
  discordAdminRoleId: string | null;
  discordGeneralChannelId: string | null;
};

export type NextStepsCounts = {
  teams: number;
  /** Members with the PLAYER role — the organisers do not count as players. */
  players: number;
};

/** The checklist, in the order an organiser goes through it. */
export function nextSteps(challenge: NextStepsChallenge, counts: NextStepsCounts): NextStep[] {
  return [
    { id: "created", label: "Défi créé", done: true },
    { id: "guild", label: "Relier un serveur Discord", done: !!challenge.discordGuildId, href: "#discord" },
    {
      id: "bot",
      label: "Inviter le bot et configurer le serveur",
      done: !!challenge.discordAdminRoleId && !!challenge.discordGeneralChannelId,
      href: "#discord",
    },
    { id: "teams", label: "Créer les équipes", done: counts.teams > 0, href: "/admin/teams" },
    {
      id: "players",
      label: "Inviter les joueurs",
      done: counts.players > 0,
      href: "/admin/players",
      hint: "ou laisse-les taper /challenger rejoindre sur ton serveur Discord",
    },
  ];
}

/** Nothing left to do: the caller hides the card. */
export function allDone(steps: NextStep[]): boolean {
  return steps.every((s) => s.done);
}
