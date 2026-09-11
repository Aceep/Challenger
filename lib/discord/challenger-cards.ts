/**
 * The three cards `/challenger creer` shows, in order: « je prépare », « tout
 * est prêt », and the apology when Discord got in the way.
 *
 * The command answers with a deferred response and then edits that one message,
 * so these are three states of the same card rather than three messages.
 *
 * Pure module (no I/O, no `server-only`): all the copy lives here, under test,
 * and `fr()` hardens the typography — write plain spaces.
 */
import { fr, type DiscordEmbed } from "@/lib/discord/cards";
import { WELCOME_COLOR } from "@/lib/discord/welcome";

/** Discord's hard limits on an embed. */
const TITLE_LIMIT = 256;
const DESCRIPTION_LIMIT = 4096;

/** Muted grey while Kyle works, brick when something failed. */
const WORKING_COLOR = 0x99aab5;
const FAILED_COLOR = 0xc0392b;

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** « du 5 janvier au 16 mars 2026 » — the year is written once when it is the same. */
function period(startAt: Date, endAt: Date): string {
  const sameYear = startAt.getUTCFullYear() === endAt.getUTCFullYear();
  return `du ${sameYear ? dayFmt.format(startAt) : dateFmt.format(startAt)} au ${dateFmt.format(endAt)}`;
}

const card = (title: string, lines: string[], color: number): DiscordEmbed => ({
  title: fr(title).slice(0, TITLE_LIMIT),
  description: fr(lines.join("\n")).slice(0, DESCRIPTION_LIMIT),
  color,
});

/** Where the organiser finishes the job — the admin desk, with Kyle's tour armed. */
const ADMIN_PATH = "/admin/challenge?tour=admin&step=0";

/**
 * The link to the settings. Someone who has never signed in has no account yet:
 * they are sent through the login, which lands them on the admin desk, where
 * the ORGANIZER invitation they were given is already consumed.
 */
export function challengeAdminUrl(appUrl: string, pendingLogin = false): string {
  return pendingLogin ? `${appUrl}/login?callbackUrl=${encodeURIComponent(ADMIN_PATH)}` : `${appUrl}${ADMIN_PATH}`;
}

/** What the bootstrap reported, as this module needs it (see `SetupSummary`). */
export type ChallengeSetupSummary = { created: string[]; skipped: string[]; errors: string[] };

/**
 * First state: the interaction is deferred, the work has not started. It must
 * say how long it takes, or the silence reads as a failure.
 */
export function challengeCreatingCard(name: string): DiscordEmbed {
  return card(
    `Je prépare « ${name} »…`,
    [
      "Une minute au plus. Je crée l’édition, le rôle des organisateur·ices, la catégorie du défi et les salons de chaque équipe.",
      "",
      "Ce message se met à jour tout seul dès que c’est prêt — inutile de retaper la commande.",
    ],
    WORKING_COLOR,
  );
}

export type ChallengeReadyInput = {
  name: string;
  startAt: Date;
  endAt: Date;
  teams: { name: string }[];
  summary: ChallengeSetupSummary;
  /** Public URL of the app, without a trailing slash. */
  appUrl: string;
  /** The creator has no account yet: an ORGANIZER invitation waits for their first login. */
  pendingLogin: boolean;
};

/** Second state: everything exists. What was created, then what the person does next. */
export function challengeReadyCard({ name, startAt, endAt, teams, summary, appUrl, pendingLogin }: ChallengeReadyInput): DiscordEmbed {
  const names = teams.map((t) => t.name);
  const lines = [
    `Le défi **« ${name} »** est ouvert, ${period(startAt, endAt)}.`,
    "",
    "**Ce que je viens de créer**",
    "• Le rôle **Organisateurs**, et je te l’ai donné.",
    `• La catégorie **${name}**, avec **#annonces-défi** (mes annonces et le classement du dimanche) et le forum **#faq**.`,
    `• ${names.length} équipes — ${names.join(", ")} — chacune avec son rôle, sa catégorie, **#aventure** et **#librairie**.`,
    "",
    "**Et maintenant**",
    "• **Invite tes lecteur·ices** avec `/inviter` (jusqu’à cinq à la fois, prises dans la liste du serveur), ou depuis « Joueurs » sur le site : personne ne rejoint un défi de lui-même.",
    pendingLogin
      ? `• **Connecte-toi avec Discord** pour devenir l’organisateur·ice du défi et régler les détails : ${challengeAdminUrl(appUrl, true)}`
      : `• **Règle les détails** — barème, bingo, quêtes, histoire : ${challengeAdminUrl(appUrl)}`,
    `• Le pas à pas, captures comprises : ${appUrl}/guide`,
  ];

  if (summary.errors.length) {
    lines.push(
      "",
      "**Ce que je n’ai pas réussi à faire**",
      ...summary.errors.slice(0, 8).map((e) => `• ${e}`),
      "Relance « Configurer le serveur Discord » depuis Admin › Défi : rien ne sera dupliqué, seul ce qui manque sera créé.",
    );
  }

  return card(`Tout est prêt : « ${name} »`, lines, WELCOME_COLOR);
}

/**
 * Third state: the edition could not be created at all. The message names the
 * reason and the one gesture that fixes it — retyping the command.
 */
export function challengeFailedCard(message: string, appUrl: string): DiscordEmbed {
  return card(
    "Je n’ai pas réussi à créer le défi",
    [message.trim() || "Discord n’a pas répondu.", "", `Retape \`/challenger creer\` dans un instant. Si cela recommence, le pas à pas est là : ${appUrl}/guide`],
    FAILED_COLOR,
  );
}
