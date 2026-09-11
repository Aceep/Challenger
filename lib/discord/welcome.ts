/**
 * The welcome Kyle writes when the app is added to a Discord server.
 *
 * Pure module (no I/O, no `server-only`): the copy lives here so it is
 * unit-tested. `fr()` hardens the French typography — write plain spaces.
 * The delivery is in `lib/services/discord-install.ts`.
 *
 * Two audiences for the same three steps: a **DM** to the person who added the
 * app (and to the server owner), and, when that DM bounces — a great many
 * people refuse DMs from server members — an impersonal **salon** variant,
 * which addresses whoever reads it rather than the installer.
 */
import { fr } from "@/lib/discord/cards";
import type { OutgoingMessage } from "@/lib/discord/rest";

/** Discord's embed description limit. */
const EMBED_LIMIT = 4096;

/** Yellow « Challenger » — the same accent as the pinned cards. */
export const WELCOME_COLOR = 0xffd84a;

/**
 * Idempotency mark of one welcome DM: one per (server, recipient), because the
 * authorising person and the server owner each get their own, and because
 * Discord retries a webhook event it thinks it failed to deliver.
 */
export const WELCOME_GUILD_KEY = (guildId: string, userId: string) => `welcome-install:${guildId}:${userId}`;

/** The salon fallback is posted at most once per server, whoever installed the app. */
export const WELCOME_CHANNEL_KEY = (guildId: string) => `welcome-install-channel:${guildId}`;

/** Who the message talks to: the installer in private, or the whole server. */
export type WelcomeAudience = "dm" | "channel";

export type WelcomeInput = {
  /** Name of the server the app was just added to. */
  guildName: string;
  /** Public URL of the app, without a trailing slash. */
  appUrl: string;
  /** The challenge this server already plays, if any (FINISHED editions count as none). */
  existing: { name: string } | null;
};

/** Discord takes up to an hour to propagate a global command after an install. */
const PROPAGATION = "*Si `/challenger` n’apparaît pas tout de suite, c’est normal : Discord met jusqu’à une heure à propager ses commandes après une installation.*";

const guide = (appUrl: string) => `📘 Le pas à pas, captures comprises : ${appUrl}/guide`;

const lines = (l: string[]) => fr(l.join("\n")).slice(0, EMBED_LIMIT);

/** « Ce serveur n’a pas encore de défi » — the three steps to open one. */
function firstRun({ guildName, appUrl }: WelcomeInput, audience: WelcomeAudience) {
  const dm = audience === "dm";
  return lines([
    dm
      ? `Salut ! Je suis **Kyle**, l’intendant du défi lecture. « ${guildName} » n’a pas encore de défi — voici comment le lancer, en trois étapes.`
      : `Bonjour ! Je suis **Kyle**, l’intendant du défi lecture, et on vient de m’ajouter à « ${guildName} ». Ce serveur n’a pas encore de défi : voici comment en ouvrir un, en trois étapes.`,
    "",
    "**1. Créer le défi, depuis le serveur**",
    dm
      ? "Tape `/challenger creer nom:<nom du défi>` dans n’importe quel salon. La commande est réservée aux personnes qui ont la permission « Gérer le serveur »."
      : "Un·e admin peut lancer le défi avec `/challenger creer nom:<nom du défi>`, dans n’importe quel salon. La commande est réservée aux personnes qui ont la permission « Gérer le serveur ».",
    "",
    "**2. Terminer sur le site**",
    "Le lien de ma réponse mène aux réglages : dates, équipes, salons. Le bouton « Configurer le serveur Discord » crée les rôles et les salons en un clic.",
    "",
    "**3. Faire venir les lecteur·ices**",
    "Les invitations se posent sur le site, dans « Joueurs » : l’invitation s’applique à la prochaine connexion Discord de la personne, et on la range ensuite dans une équipe.",
    "",
    guide(appUrl),
    PROPAGATION,
    "",
    `🌐 ${appUrl}`,
  ]);
}

/** The server already plays an edition: nothing to create, just where to go. */
function alreadyRunning({ appUrl, existing }: WelcomeInput & { existing: { name: string } }, audience: WelcomeAudience) {
  const dm = audience === "dm";
  return lines([
    dm
      ? `Salut ! Je suis **Kyle**, l’intendant du défi lecture. Ce serveur joue déjà « ${existing.name} » : rien à créer.`
      : `Bonjour ! Je suis **Kyle**, l’intendant du défi lecture. Ce serveur joue déjà « ${existing.name} » : rien à créer.`,
    "",
    `• Pour y participer : ${dm ? "demande" : "demandez"} une invitation aux organisateur·ices, elle s’applique à la prochaine connexion.`,
    `• Pour le piloter (dates, équipes, salons) : ${appUrl}/admin/challenge`,
    "",
    guide(appUrl),
    PROPAGATION,
  ]);
}

/** The welcome message, as a ready-to-post message (DM by default). */
export function installWelcomeMessage(input: WelcomeInput, audience: WelcomeAudience = "dm"): OutgoingMessage {
  return {
    embeds: [
      {
        title: fr(`👋 Kyle est arrivé sur « ${input.guildName} »`).slice(0, 256),
        description: input.existing ? alreadyRunning({ ...input, existing: input.existing }, audience) : firstRun(input, audience),
        color: WELCOME_COLOR,
      },
    ],
  };
}
