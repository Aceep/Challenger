/**
 * The private message Kyle sends to someone who has just been invited.
 *
 * Until now an invitation was silent: the person learned about it by logging
 * in, which they had no reason to do. This message is the whole notification —
 * what they were invited to, where to click, and what happens next.
 *
 * Pure module (no I/O, no `server-only`): the copy lives here, under test.
 * `fr()` hardens the French typography — write plain spaces.
 */
import { fr, type DiscordEmbed } from "@/lib/discord/cards";
import type { OutgoingMessage } from "@/lib/discord/rest";
import { WELCOME_COLOR } from "@/lib/discord/welcome";

/** Discord's embed limits. */
const TITLE_LIMIT = 256;
const DESCRIPTION_LIMIT = 4096;

export type InviteDmInput = {
  challengeName: string;
  /** The team the invitation seats them in, or null when it is left for later. */
  teamName: string | null;
  /** Name of the Discord server the challenge is played on, when we know it. */
  guildName: string | null;
  /** Public URL of the app, without a trailing slash. */
  appUrl: string;
};

/** The invitation DM, ready to post in the person's private channel. */
export function inviteDmMessage({ challengeName, teamName, guildName, appUrl }: InviteDmInput): OutgoingMessage {
  const lines = [
    `Salut ! Je suis **Kyle**, l’intendant du défi lecture${guildName ? ` de « ${guildName} »` : ""}. On vient de t’inviter à **« ${challengeName} »**.`,
    "",
    `**1. Connecte-toi** avec ton compte Discord : ${appUrl}/login`,
    teamName
      ? `**2. Ton équipe est déjà choisie** : **${teamName}**. Rien à demander, rien à installer.`
      : "**2. Ton équipe te sera attribuée** par l’organisation — tu peux commencer sans attendre.",
    "**3. Tes salons apparaissent sur le serveur** dès ta connexion : la librairie de ton équipe pour déclarer tes lectures, son salon aventure pour l’histoire et les votes.",
    "",
    `Le pas à pas côté joueur·euse : ${appUrl}/guide#joueur`,
  ];

  const embed: DiscordEmbed = {
    title: fr(`Tu es invité·e au défi « ${challengeName} »`).slice(0, TITLE_LIMIT),
    description: fr(lines.join("\n")).slice(0, DESCRIPTION_LIMIT),
    color: WELCOME_COLOR,
  };
  return { embeds: [embed] };
}
