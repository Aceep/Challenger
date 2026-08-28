/** Rules + commands summary, shared by the Discord `/help` command and the web /help page. */

export const APP_URL = () => process.env.AUTH_URL ?? "https://challenger-aceepkyle.vercel.app";

export type HelpSection = { title: string; lines: string[] };

/** `channels` lets Discord render real channel mentions; the web page passes names. */
export function helpSections(channels: { library: string; adventure: string }): HelpSection[] {
  return [
    {
      title: "📚 Lectures",
      lines: [
        `**/ajouter-un-livre** titre · auteur · pages · type · quête · case — dans ${channels.library}`,
        `**/modifier-un-livre** livre · [champs] · supprimer — dans ${channels.library}`,
        "Points : pages ÷ 10 ; moins de 150 pages : pages ÷ 2 ÷ 10 (149 p. → 7,5 pts). Arrondi à 0,1.",
        "Type : **roman** (≥ 150 p.) ou **graphique** (BD, manga… ou toute lecture < 150 p.).",
        "Modifiable pendant 1 h après l'ajout ; ensuite seul·e le·la capitaine (les admins à tout moment).",
      ],
    },
    {
      title: "🗺️ Quêtes et 🎯 bingo",
      lines: [
        "**/quete** — les quêtes ouvertes de ton équipe et leur avancement.",
        "Un **roman** valide seul une quête et/ou une case. Un **graphique** vaut ½ quête + ½ case : il en faut deux (d'un ou deux membres de l'équipe).",
        "Une lecture valide au plus **une** quête et **une** case. Une case ou quête « en attente » (½) ne rapporte rien tant qu'elle n'est pas complétée.",
        "Antériorité : la lecture doit avoir commencé après la parution de la grille (ou : roman lu à moins de 50 %). Déclaratif, sur la confiance.",
        "Le bingo est collectif : une grille à la fois, la suivante s'ouvre quand toutes les cases sont validées.",
      ],
    },
    {
      title: "🏆 Classement et vérification",
      lines: [
        "**/score** — le classement des équipes.",
        "Chaque **dimanche 19 h – 21 h** : fenêtre de vérification, les ajouts/modifications/suppressions sont suspendus (le délai d'1 h est mis en pause). Classement publié à **20 h**.",
      ],
    },
    {
      title: "📖 Histoire",
      lines: [
        `**/histoire** — le chapitre en cours ; votes par boutons ou sur le site — dans ${channels.adventure}`,
        "Quorum : 3 votants (ou toute l'équipe si elle est plus petite). Tu peux changer ton vote jusqu'à la clôture.",
        "Délai écoulé sans majorité → le choix par défaut du chapitre s'applique.",
        "Égalité : le·la capitaine tranche (5 h), puis l'adjoint·e (5 h), puis le premier membre qui se manifeste avec l'accord d'un·e admin. Compteurs en pause de minuit à 8 h.",
      ],
    },
    {
      title: "❓ Questions",
      lines: [
        "**/question** titre · détail — ta question ouvre un sujet dans le forum **#faq** et l'organisation est prévenue.",
        "Tout le monde peut répondre dans le fil : les réponses remontent automatiquement sur la page **FAQ** du site (quelques minutes au plus).",
        "Depuis le site, la page FAQ permet aussi de poser une question, de répondre et de marquer une question comme résolue (auteur·rice ou admin).",
        "Les réponses les plus utiles sont épinglées en haut de la page, dans « Questions fréquentes ».",
      ],
    },
  ];
}

/** Discord markdown for the ephemeral `/help` reply. */
export function helpText(team: { discordChannelId: string | null; discordLibraryChannelId: string | null } | null) {
  const library = team?.discordLibraryChannelId ?? team?.discordChannelId;
  const adventure = team?.discordChannelId;
  const sections = helpSections({
    library: library ? `<#${library}>` : "le salon *librairie* de ton équipe",
    adventure: adventure ? `<#${adventure}>` : "le salon *aventure* de ton équipe",
  });
  return `${sections.map((s) => `**${s.title}**\n${s.lines.map((l) => `• ${l}`).join("\n")}`).join("\n\n")}\n\n🌐 Tout est aussi sur le site : ${APP_URL()} (aide : ${APP_URL()}/help)`;
}

export type TeamChannels = { name: string; discordChannelId: string | null; discordLibraryChannelId: string | null };

/** Discord's embed description limit. */
const EMBED_LIMIT = 4096;

const mention = (id: string | null, fallback: string) => (id ? `<#${id}>` : fallback);

/**
 * Kyle's pinned welcome, posted once per team in its *aventure* salon by the
 * guild bootstrap. Kept under Discord's 4096-character embed limit.
 */
export function welcomeMessage(team: TeamChannels): { title: string; description: string } {
  const adventure = mention(team.discordChannelId, "le salon *aventure*");
  const library = mention(team.discordLibraryChannelId, "le salon *librairie*");
  const intro = [
    `Moi c'est **Kyle**, la mascotte du défi — jaune, dinosaure, et intraitable sur les ½ crédits.`,
    `Vous avez deux salons : ${adventure} pour votre histoire, les votes et mes annonces, et ${library} pour déclarer vos lectures.`,
    `Une lecture terminée ? **/ajouter-un-livre** dans ${library}, ou sur le site.`,
    "",
    helpText(team),
  ].join("\n");
  const description = intro.length > EMBED_LIMIT ? `${intro.slice(0, EMBED_LIMIT - 60).trimEnd()}\n\n🌐 La suite sur ${APP_URL()}/help` : intro;
  return { title: `👋 Bienvenue chez ${team.name} !`, description };
}

/** The short pinned reminder posted in the *librairie* salon. */
export function libraryWelcomeMessage(team: TeamChannels): { title: string; description: string } {
  return {
    title: `📚 La librairie ${team.name}`,
    description: [
      "C'est ici qu'on déclare ses lectures :",
      "• **/ajouter-un-livre** titre · auteur · pages · type · quête · case",
      "• **/modifier-un-livre** pour corriger ou supprimer (1 h après l'ajout, puis le·la capitaine)",
      "",
      `Points : **pages ÷ 10** ; moins de 150 pages : moitié (149 p. → 7,5 pts).`,
      `Toutes les règles : **/help** ou ${APP_URL()}/help`,
    ].join("\n"),
  };
}
