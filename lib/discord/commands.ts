/**
 * Slash command definitions, shared by the registration script
 * (`scripts/discord-register.mts`) and the guild bootstrap
 * (`lib/services/discord-setup.ts`, which registers them for the organiser).
 * Pure data, client-safe.
 */

const STRING = 3;
const INTEGER = 4;
const BOOLEAN = 5;

const TYPE_CHOICES = [
  { name: "roman", value: "ROMAN" },
  { name: "graphique", value: "GRAPHIQUE" },
];

/**
 * One option — or one sub-command (`type` 1), which carries its own options.
 * Discord nests at most two levels, so the recursion never goes deep.
 */
export type SlashOption = {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  autocomplete?: boolean;
  min_value?: number;
  max_value?: number;
  max_length?: number;
  choices?: { name: string; value: string }[];
  /** Options of a sub-command (`type` 1). */
  options?: SlashOption[];
};

export type SlashCommand = {
  name: string;
  description: string;
  /** Permission bits Discord requires to even see the command (decimal string). */
  default_member_permissions?: string;
  /** `false` hides the command in DMs — anything guild-scoped needs it. */
  dm_permission?: boolean;
  options?: SlashOption[];
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "ajouter-un-livre",
    description: "Enregistrer une lecture terminée (dans la librairie de ton équipe)",
    options: [
      { type: STRING, name: "titre", description: "Titre", required: true },
      { type: STRING, name: "auteur", description: "Auteur·ice", required: true },
      {
        type: INTEGER,
        name: "pages",
        description: "Nombre de pages (édition la plus avantageuse ; < 150 = graphique)",
        required: true,
        min_value: 1,
        max_value: 5000,
      },
      { type: STRING, name: "type", description: "Roman (défaut) ou graphique (BD, manga…) : ½ quête et ½ case", required: false, choices: TYPE_CHOICES },
      { type: STRING, name: "quete", description: "Quête validée par cette lecture (commencée après la parution de la grille)", required: false, autocomplete: true },
      { type: STRING, name: "case", description: "Case du bingo validée par cette lecture (même règle d'antériorité)", required: false, autocomplete: true },
    ],
  },
  {
    name: "modifier-un-livre",
    description: "Modifier ou supprimer une lecture (1 h après l'ajout, puis capitaine)",
    options: [
      { type: STRING, name: "livre", description: "Lecture à modifier", required: true, autocomplete: true },
      { type: STRING, name: "titre", description: "Nouveau titre", required: false },
      { type: STRING, name: "auteur", description: "Nouvel·le auteur·ice", required: false },
      { type: INTEGER, name: "pages", description: "Nouveau nombre de pages", required: false, min_value: 1, max_value: 5000 },
      { type: STRING, name: "type", description: "Roman ou graphique", required: false, choices: TYPE_CHOICES },
      { type: STRING, name: "quete", description: "Rattacher à une quête", required: false, autocomplete: true },
      { type: STRING, name: "case", description: "Placer sur une case du bingo", required: false, autocomplete: true },
      { type: BOOLEAN, name: "supprimer", description: "Supprimer cette lecture", required: false },
    ],
  },
  {
    name: "question",
    description: "Poser une question à l'organisation (elle ouvre un sujet dans le forum faq)",
    options: [
      { type: STRING, name: "titre", description: "La question en une phrase", required: true, max_length: 100 },
      { type: STRING, name: "detail", description: "Précisions (facultatif)", required: false, max_length: 1000 },
    ],
  },
  { name: "score", description: "Afficher le classement des équipes" },
  { name: "quete", description: "Lister les quêtes ouvertes et leur avancement" },
  { name: "bingo", description: "Voir la grille de ton équipe : cases validées, en attente ½ et libres" },
  { name: "histoire", description: "Voir le chapitre en cours de ton équipe" },
  { name: "help", description: "Les commandes et les règles du défi" },
];
