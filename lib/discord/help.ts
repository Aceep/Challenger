/** Rules + commands summary, shared by the Discord `/help` command and the web /help page. */

export const APP_URL = () => process.env.AUTH_URL ?? "https://challenge-six-rose.vercel.app";

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
