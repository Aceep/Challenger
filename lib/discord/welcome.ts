/**
 * The DM Kyle sends when the app is added to a Discord server.
 *
 * Pure module (no I/O, no `server-only`): the copy lives here so it is
 * unit-tested. `fr()` hardens the French typography — write plain spaces.
 * The delivery is in `lib/services/discord-install.ts`.
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

const lines = (l: string[]) => fr(l.join("\n")).slice(0, EMBED_LIMIT);

/** « Ce serveur n’a pas encore de défi » — the three steps to open one. */
function firstRun({ guildName, appUrl }: WelcomeInput) {
  return lines([
    `Salut ! Je suis **Kyle**, l’intendant du défi lecture. « ${guildName} » n’a pas encore de défi — voici comment le lancer, en trois étapes.`,
    "",
    "**1. Crée le défi, depuis le serveur**",
    "Tape `/challenger creer nom:<nom du défi>` dans n’importe quel salon. La commande est réservée aux personnes qui ont la permission « Gérer le serveur ».",
    "",
    "**2. Termine sur le site**",
    `Suis le lien de ma réponse : tu y règles les dates, les équipes et les salons. Le bouton « Configurer le serveur Discord » crée les rôles et les salons en un clic.`,
    "",
    "**3. Fais venir tes lecteur·ices**",
    "Elles et ils tapent `/challenger rejoindre` sur le serveur ; tu les répartis ensuite en équipes.",
    "",
    PROPAGATION,
    "",
    `🌐 ${appUrl}`,
  ]);
}

/** The server already plays an edition: nothing to create, just where to go. */
function alreadyRunning({ appUrl, existing }: WelcomeInput & { existing: { name: string } }) {
  return lines([
    `Salut ! Je suis **Kyle**, l’intendant du défi lecture. Ce serveur joue déjà « ${existing.name} » : rien à créer.`,
    "",
    "• Pour y participer : tape `/challenger rejoindre` dans un salon du serveur.",
    `• Pour le piloter (dates, équipes, salons) : ${appUrl}/admin/challenge`,
    "",
    PROPAGATION,
  ]);
}

/** The welcome DM, as a ready-to-post message. */
export function installWelcomeMessage(input: WelcomeInput): OutgoingMessage {
  return {
    embeds: [
      {
        title: fr(`👋 Kyle est arrivé sur « ${input.guildName} »`).slice(0, 256),
        description: input.existing ? alreadyRunning({ ...input, existing: input.existing }) : firstRun(input),
        color: WELCOME_COLOR,
      },
    ],
  };
}
