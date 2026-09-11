/**
 * « Prochaines étapes » of a freshly created challenge — pure, no I/O.
 *
 * Someone who just created their edition lands on Admin › Défi with a lot of
 * cards and no idea which one comes first. This turns the state of the edition
 * into an ordered checklist; once everything is done the card disappears.
 *
 * Coming from `/challenger creer`, the whole list is already ticked but the
 * last line: Kyle created the edition, the server and the teams, and only the
 * invitations are left. Coming from the web form, it is the real order of the
 * gestures — server, bot, teams, players.
 */

export type NextStepId = "created" | "guild" | "bot" | "teams" | "players";

export type NextStep = {
  id: NextStepId;
  label: string;
  done: boolean;
  /** Where the « Ouvrir » button of an unfinished step goes. */
  href?: string;
  /** What the step is worth right now (« 3 équipes, 2 câblées »). */
  detail?: string;
  /** Second line, when the step has an alternative worth knowing. */
  hint?: string;
};

export type NextStepsChallenge = {
  discordGuildId: string | null;
  discordAdminRoleId: string | null;
  /** Category of the edition, created by the bootstrap along with its salons. */
  discordCategoryId: string | null;
  discordGeneralChannelId: string | null;
  discordFaqChannelId: string | null;
};

export type NextStepsCounts = {
  teams: number;
  /** Teams that have their Discord role and both salons (`teamDiscordReady`). */
  teamsReady: number;
  /** Members with the PLAYER role — the organisers do not count as players. */
  players: number;
  /** Invitations posted but not yet consumed: the person was invited all the same. */
  pendingInvites: number;
};

/** The checklist, in the order an organiser goes through it. */
export function nextSteps(challenge: NextStepsChallenge, counts: NextStepsCounts): NextStep[] {
  const salons = !!challenge.discordAdminRoleId && !!challenge.discordCategoryId && !!challenge.discordGeneralChannelId && !!challenge.discordFaqChannelId;
  const invited = counts.players + counts.pendingInvites;

  return [
    { id: "created", label: "Défi créé", done: true },
    { id: "guild", label: "Relier un serveur Discord", done: !!challenge.discordGuildId, href: "#discord" },
    {
      id: "bot",
      label: "Kyle installé et salons créés",
      done: salons,
      href: "#discord",
      detail: salons ? "rôle Organisateurs, catégorie du défi, #annonces-défi et #faq" : undefined,
    },
    {
      id: "teams",
      label: "Créer les équipes",
      done: counts.teams > 0 && counts.teamsReady === counts.teams,
      href: "/admin/teams",
      detail: counts.teams > 0 ? `${counts.teams} équipe${counts.teams > 1 ? "s" : ""}, ${counts.teamsReady} câblée${counts.teamsReady > 1 ? "s" : ""} sur Discord` : undefined,
      hint: counts.teams > 0 && counts.teamsReady < counts.teams ? "relance « Configurer le serveur Discord » pour créer ce qui manque" : undefined,
    },
    {
      id: "players",
      label: "Inviter les joueurs",
      done: invited > 0,
      href: "/admin/players",
      detail: counts.pendingInvites > 0 ? `${counts.pendingInvites} invitation${counts.pendingInvites > 1 ? "s" : ""} en attente` : undefined,
      hint: "leur invitation s’applique à leur prochaine connexion Discord",
    },
  ];
}

/** Nothing left to do: the caller hides the card. */
export function allDone(steps: NextStep[]): boolean {
  return steps.every((s) => s.done);
}
