/**
 * Fixtures for the public, read-only demo (`/demo`, `/demo/admin`).
 *
 * No Prisma, no session: these constants are typed like the props of the real
 * views so the demo stays aligned with the app. Points follow the rulebook
 * (pages ÷ 10, halved under 150 p.) — `lib/demo/data.test.ts` checks it.
 */

import type { BookRow } from "@/app/(player)/books/BooksView";
import type { BoardCell } from "@/app/(player)/bingo/BingoBoard";
import type { FaqQuestionRow } from "@/app/(player)/faq/FaqListView";
import type { QuestionDetailView, QuestionMessageRow } from "@/app/(player)/faq/QuestionView";
import type { HomeViewProps } from "@/app/(player)/home/HomeView";
import type { LeaderboardRowView } from "@/app/(player)/leaderboard/LeaderboardView";
import type { QuestRow } from "@/app/(player)/quests/QuestsView";
import type { StoryViewProps } from "@/app/(player)/story/StoryView";
import type { TeamViewProps } from "@/app/(player)/team/TeamView";
import type { DashboardViewProps } from "@/app/admin/DashboardView";
import type { AdminGridRow, GridProgress } from "@/app/admin/bingo/BingoAdminView";
import type { ChallengeValues } from "@/app/admin/challenge/ChallengeForm";
import type { AdminQuestRow } from "@/app/admin/quests/QuestsAdminView";
import type { PlayerRow } from "@/app/admin/players/PlayersView";
import type { AdminReadingRow } from "@/app/admin/readings/ReadingsView";
import type { EditorStory } from "@/app/admin/story/StoryEditor";
import type { TeamStoryRow } from "@/app/admin/story/StoryAdminView";
import type { AdminTeamRow } from "@/app/admin/teams/TeamsView";

// ---------------------------------------------------------------------------
// Édition et équipes
// ---------------------------------------------------------------------------

/**
 * Demo dates are relative to render time so the fixtures never read as stale
 * ("clos dans 31 h" rather than a date from last year).
 */
const NOW = Date.now();
const HOUR = 3_600_000;
const inHours = (h: number) => new Date(NOW + h * HOUR);
const daysAgo = (d: number) => new Date(NOW - d * 24 * HOUR);
const inDays = (d: number) => new Date(NOW + d * 24 * HOUR);

export const DEMO_CHALLENGE = {
  id: "demo-challenge-automne",
  name: "Automne des Pages 2026",
  color: "#2E4A7D",
  startAt: daysAgo(16),
  endAt: inDays(40),
  week: 3,
  weeks: 8,
} as const;

export const DEMO_ARCHIVE = {
  id: "demo-challenge-salem",
  name: "Salem",
  color: "#3B2A4A",
  period: "Septembre – octobre 2025",
  summary: "4 équipes · 312 lectures · vainqueur : Les Sorcières du Nord",
} as const;

export const DEMO_TEAMS = [
  { id: "demo-team-herissons", name: "Les Hérissons", color: "#B5533C", captain: "Nour", deputy: "Élise", points: 260 },
  { id: "demo-team-renards", name: "Les Renards", color: "#2E4A7D", captain: "Marc", deputy: "Sara", points: 248.6 },
  { id: "demo-team-loutres", name: "Les Loutres", color: "#3C7A5E", captain: "Tom", deputy: null, points: 201.3 },
  { id: "demo-team-hiboux", name: "Les Hiboux", color: "#7B4B9C", captain: "Inès", deputy: "Paul", points: 201.3 },
] as const;

/** The demo player: Léa, of Les Renards. */
export const DEMO_PLAYER = { id: "demo-user-lea", name: "Léa", teamId: "demo-team-renards" } as const;
export const DEMO_TEAM = DEMO_TEAMS[1];

/** Same labelling as lib/services/bingo (kept local: the demo never imports server code). */
const cellLabel = (row: number, col: number) => `${String.fromCharCode(65 + col)}${row + 1}`;

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------

/** Every reading of Les Renards, points computed with the rulebook. */
export const DEMO_BOOKS: (BookRow & { userId: string })[] = [
  {
    id: "demo-book-trois-corps",
    userId: "demo-user-lea",
    title: "Le Problème à trois corps",
    author: "Liu Cixin",
    pages: 512,
    type: "ROMAN",
    finishedAt: daysAgo(1),
    points: 51.2,
    owner: "Léa",
    editable: true,
    editUntil: inHours(0.75),
    questNumber: 3,
    questHalf: false,
    cellLabel: "D1",
    cellHalf: false,
  },
  {
    id: "demo-book-blacksad",
    userId: "demo-user-lea",
    title: "Blacksad, t. 1",
    author: "Díaz Canales & Guarnido",
    pages: 56,
    type: "GRAPHIQUE",
    finishedAt: daysAgo(3),
    points: 2.8,
    owner: "Léa",
    editable: false,
    editUntil: null,
    questNumber: null,
    questHalf: false,
    cellLabel: "B2",
    cellHalf: true,
  },
  {
    id: "demo-book-furtifs",
    userId: "demo-user-lea",
    title: "Les Furtifs",
    author: "Alain Damasio",
    pages: 704,
    type: "ROMAN",
    finishedAt: daysAgo(9),
    points: 70.4,
    owner: "Léa",
    editable: false,
    editUntil: null,
    questNumber: null,
    questHalf: false,
    cellLabel: "C1",
    cellHalf: false,
  },
  {
    id: "demo-book-linh",
    userId: "demo-user-lea",
    title: "La Petite Fille de M. Linh",
    author: "Philippe Claudel",
    pages: 149,
    type: "GRAPHIQUE",
    finishedAt: daysAgo(16),
    points: 7.5,
    owner: "Léa",
    editable: false,
    editUntil: null,
    questNumber: 1,
    questHalf: true,
    cellLabel: null,
    cellHalf: false,
  },
  {
    id: "demo-book-rose",
    userId: "demo-user-marc",
    title: "Le Nom de la rose",
    author: "Umberto Eco",
    pages: 640,
    type: "ROMAN",
    finishedAt: daysAgo(5),
    points: 64,
    owner: "Marc",
    editable: false,
    editUntil: null,
    questNumber: null,
    questHalf: false,
    cellLabel: "A1",
    cellHalf: false,
  },
  {
    id: "demo-book-chanson",
    userId: "demo-user-sara",
    title: "Chanson douce",
    author: "Leïla Slimani",
    pages: 127,
    type: "GRAPHIQUE",
    finishedAt: daysAgo(7),
    points: 6.4,
    owner: "Sara",
    editable: false,
    editUntil: null,
    questNumber: null,
    questHalf: false,
    cellLabel: "E1",
    cellHalf: true,
  },
  {
    id: "demo-book-prince",
    userId: "demo-user-yanis",
    title: "Le Petit Prince",
    author: "Antoine de Saint-Exupéry",
    pages: 126,
    type: "GRAPHIQUE",
    finishedAt: daysAgo(11),
    points: 6.3,
    owner: "Yanis",
    editable: false,
    editUntil: null,
    questNumber: null,
    questHalf: false,
    cellLabel: "E1",
    cellHalf: false,
  },
];

export const DEMO_MY_BOOKS = DEMO_BOOKS.filter((b) => b.userId === DEMO_PLAYER.id);
export const DEMO_TEAM_BOOKS = DEMO_BOOKS.filter((b) => b.userId !== DEMO_PLAYER.id);

/** Whether a demo reading was declared as a graphic novel (before the < 150 p. rule). */
export const DEMO_DECLARED_GRAPHIC: Record<string, boolean> = {
  "demo-book-trois-corps": false,
  "demo-book-blacksad": true,
  "demo-book-furtifs": false,
  "demo-book-linh": false,
  "demo-book-rose": false,
  "demo-book-chanson": false,
  "demo-book-prince": false,
};

// ---------------------------------------------------------------------------
// Livre de comptes (append-only) — sa somme fait le score de l'équipe
// ---------------------------------------------------------------------------

export const DEMO_LEDGER = [
  { id: "demo-pe-1", source: "READING", who: "Léa", label: "Lecture : Le Problème à trois corps", amount: 51.2 },
  { id: "demo-pe-2", source: "QUEST", who: "Léa", label: "Quête #3 : Un roman traduit d'une langue asiatique", amount: 20 },
  { id: "demo-pe-3", source: "BINGO", who: "Marc", label: "Ligne de bingo : Couleurs d'automne", amount: 25 },
  { id: "demo-pe-4", source: "STORY", who: "Sara", label: "Histoire : Les Hérissons vous volent des points", amount: -5 },
  { id: "demo-pe-5", source: "READING", who: "Marc", label: "Lecture : Le Nom de la rose", amount: 64 },
  { id: "demo-pe-6", source: "READING", who: "Léa", label: "Lecture : Les Furtifs", amount: 70.4 },
  { id: "demo-pe-7", source: "READING", who: "Léa", label: "Lecture : La Petite Fille de M. Linh", amount: 7.5 },
  { id: "demo-pe-8", source: "READING", who: "Sara", label: "Lecture : Chanson douce", amount: 6.4 },
  { id: "demo-pe-9", source: "READING", who: "Yanis", label: "Lecture : Le Petit Prince", amount: 6.3 },
  { id: "demo-pe-10", source: "READING", who: "Léa", label: "Lecture : Blacksad, t. 1", amount: 2.8 },
] as const;

export const DEMO_MEMBERS: TeamViewProps["members"] = [
  { id: "demo-user-lea", name: "Léa", books: 2, graphics: 2, pages: 1421, points: 151.9, isCaptain: false, isDeputy: false },
  { id: "demo-user-marc", name: "Marc", books: 1, graphics: 0, pages: 640, points: 89, isCaptain: true, isDeputy: false },
  { id: "demo-user-yanis", name: "Yanis", books: 0, graphics: 1, pages: 126, points: 6.3, isCaptain: false, isDeputy: false },
  { id: "demo-user-sara", name: "Sara", books: 0, graphics: 1, pages: 127, points: 1.4, isCaptain: false, isDeputy: true },
];

export const DEMO_BY_SOURCE: Record<string, number> = { READING: 208.6, BINGO: 25, QUEST: 20, STORY: -5 };

// ---------------------------------------------------------------------------
// Bingo — grille 2 « Couleurs d'automne »
// ---------------------------------------------------------------------------

const PROMPTS = [
  "Une couverture rouge",
  "Un titre d'un seul mot",
  "Un roman de +500 p.",
  "Un auteur jamais lu",
  "Un livre offert",
  "Une héroïne",
  "Une couverture bleue",
  "Un prix littéraire",
  "Un recueil de poésie",
  "Un livre de la bibli",
  "Un polar",
  "Une traduction",
  "Une autrice française",
  "Un livre relu",
  "Un feel-good",
  "Une saga (t. 1)",
  "Un titre avec un chiffre",
  "Un essai",
  "Un livre de +10 ans",
  "Un huis clos",
  "Une BD",
  "Un livre audio",
  "Un classique",
  "Un premier roman",
  "Un titre avec une couleur",
];

const DONE: Record<number, { title: string; owner: string; type: "ROMAN" | "GRAPHIQUE" }[]> = {
  0: [{ title: "Le Nom de la rose", owner: "Marc", type: "ROMAN" }],
  1: [{ title: "Sapiens", owner: "Sara", type: "ROMAN" }],
  2: [{ title: "Les Furtifs", owner: "Léa", type: "ROMAN" }],
  3: [{ title: "Le Problème à trois corps", owner: "Léa", type: "ROMAN" }],
  4: [
    { title: "Le Petit Prince", owner: "Yanis", type: "GRAPHIQUE" },
    { title: "Chanson douce", owner: "Sara", type: "GRAPHIQUE" },
  ],
  7: [{ title: "Le Mage du Kremlin", owner: "Marc", type: "ROMAN" }],
  12: [{ title: "La Place", owner: "Sara", type: "ROMAN" }],
  13: [{ title: "Dune", owner: "Marc", type: "ROMAN" }],
  20: [
    { title: "Blacksad, t. 2", owner: "Yanis", type: "GRAPHIQUE" },
    { title: "Persepolis", owner: "Léa", type: "GRAPHIQUE" },
  ],
};

const HALF: Record<number, { title: string; owner: string; type: "ROMAN" | "GRAPHIQUE" }[]> = {
  6: [{ title: "Blacksad, t. 1", owner: "Léa", type: "GRAPHIQUE" }],
  18: [{ title: "Zazie dans le métro", owner: "Sara", type: "GRAPHIQUE" }],
};

export const DEMO_BOARD_CELLS: BoardCell[] = PROMPTS.map((prompt, i) => {
  const row = Math.floor(i / 5);
  const col = i % 5;
  const books = (DONE[i] ?? HALF[i] ?? []).map((b, n) => ({ id: `demo-fill-${i}-${n}`, ...b }));
  return {
    id: `demo-cell-${i}`,
    label: cellLabel(row, col),
    prompt,
    books,
    weight: DONE[i] ? 1 : HALF[i] ? 0.5 : 0,
    complete: !!DONE[i],
  };
});

/** Grid 4 in the series is a 4×4; the demo team plays grid 2. */
export const DEMO_GRID = { id: "demo-grid-2", order: 2, title: "Couleurs d'automne", size: 5, cells: DEMO_BOARD_CELLS, completedLines: 1 };
export const DEMO_GRID_TOTAL = 4;
export const DEMO_GRID_HISTORY = [{ id: "demo-teamgrid-1", order: 1, title: "Rentrée littéraire", completedAt: daysAgo(14) }];

export const DEMO_PLACEABLE_BOOKS = [
  { id: "demo-book-rose", title: "Mémoires de la forêt", type: "ROMAN" as const, owner: "Marc", placedOn: null },
  { id: "demo-book-persepolis", title: "Persepolis", type: "GRAPHIQUE" as const, owner: "Léa", placedOn: "demo-cell-20" },
];

// ---------------------------------------------------------------------------
// Quêtes
// ---------------------------------------------------------------------------

export const DEMO_QUESTS: QuestRow[] = [
  {
    id: "demo-quest-3",
    number: 3,
    title: "Un roman traduit d'une langue asiatique",
    description: null,
    points: 20,
    openAt: null,
    closeAt: null,
    open: true,
    done: true,
    progress: 1,
    fromStory: false,
    forMyTeam: false,
    linkedBooks: [{ id: "demo-book-trois-corps", title: "Le Problème à trois corps", type: "ROMAN", owner: "Léa" }],
  },
  {
    id: "demo-quest-1",
    number: 1,
    title: "Un livre de moins de 200 pages",
    description: null,
    points: 10,
    openAt: null,
    closeAt: null,
    open: true,
    done: false,
    progress: 0.5,
    fromStory: false,
    forMyTeam: false,
    linkedBooks: [{ id: "demo-book-linh", title: "La Petite Fille de M. Linh", type: "GRAPHIQUE", owner: "Léa" }],
  },
  {
    id: "demo-quest-4",
    number: 4,
    title: "Un livre conseillé par un autre membre",
    description: null,
    points: 15,
    openAt: null,
    closeAt: inDays(6),
    open: true,
    done: false,
    progress: 0,
    fromStory: false,
    forMyTeam: false,
    linkedBooks: [],
  },
  {
    id: "demo-quest-6",
    number: 6,
    title: "Défi des Hérissons : un recueil de nouvelles",
    description: "Imposée par le choix des Hérissons au chapitre 3.",
    points: 25,
    openAt: null,
    closeAt: inDays(6),
    open: true,
    done: false,
    progress: 0,
    fromStory: true,
    forMyTeam: true,
    linkedBooks: [],
  },
  {
    id: "demo-quest-2",
    number: 2,
    title: "Un classique du XIXᵉ",
    description: null,
    points: 20,
    openAt: inDays(4),
    closeAt: null,
    open: false,
    done: false,
    progress: 0,
    fromStory: false,
    forMyTeam: false,
    linkedBooks: [],
  },
];

// ---------------------------------------------------------------------------
// Histoire
// ---------------------------------------------------------------------------

export const DEMO_STORY: Pick<StoryViewProps, "storyTitle" | "node" | "unmet" | "choices" | "vote" | "rivals" | "allies" | "history"> = {
  storyTitle: "La Bibliothèque sans fin",
  node: {
    title: "Chapitre 4 — La salle des cartes",
    body: "Les étagères s'écartent sur une salle circulaire. Au centre, une table de cartes où quatre pions — un renard, un hérisson, un hibou, une loutre — avancent seuls. Le vôtre hésite entre deux couloirs. Une voix, quelque part : « Choisissez, mais choisissez vite. »",
    isEnding: false,
  },
  unmet: [],
  choices: [
    {
      id: "demo-choice-gauche",
      label: "Prendre le couloir de gauche, vers la lumière",
      locked: false,
      lockReason: null,
      effects: ["+15 pts pour l'équipe"],
      votes: ["Léa", "Marc"],
    },
    {
      id: "demo-choice-droite",
      label: "Prendre le couloir de droite, vers les voix",
      locked: false,
      lockReason: null,
      effects: ["Vole 20 pts à une équipe · le·la capitaine choisit la cible"],
      votes: ["Sara", "Yanis"],
    },
    {
      id: "demo-choice-runes",
      label: "Déplier la carte et lire les runes",
      locked: true,
      lockReason: "Débloquée par la quête « Un classique du XIXᵉ »",
      effects: [],
      votes: [],
    },
  ],
  vote: {
    id: "demo-vote-4",
    status: "OPEN",
    deadline: inHours(31),
    myChoiceId: "demo-choice-gauche",
    ballots: 4,
    resultChoice: null,
    tie: { stage: "CAPTAIN", leaders: ["demo-choice-gauche", "demo-choice-droite"], canBreak: false, pendingChoiceId: null },
  },
  rivals: DEMO_TEAMS.filter((t) => t.id !== DEMO_TEAM.id).map((t) => ({ id: t.id, name: t.name })),
  allies: [],
  history: [
    { title: "Le hall d'entrée", choiceLabel: null },
    { title: "L'escalier de pierre", choiceLabel: "Suivre le chat" },
    { title: "Le jardin d'hiver", choiceLabel: "Monter" },
    { title: "La salle des cartes", choiceLabel: "Cueillir la clé" },
  ],
};

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

const hoursAgo = (h: number) => new Date(NOW - h * HOUR);
const DEMO_GUILD = "962000000000000001";
const faqThread = (n: number) => `https://discord.com/channels/${DEMO_GUILD}/97200000000000000${n}`;

const QUESTION_MESSAGES: Record<string, QuestionMessageRow[]> = {
  "demo-question-manga": [
    {
      id: "demo-qm-manga-1",
      author: "Alycia",
      isAdmin: true,
      fromDiscord: false,
      body: "Oui : un manga est une lecture graphique. Il vaut donc ½ quête et ½ case — il en faut deux pour valider, et les points sont ceux du barème (pages ÷ 10, moitié sous 150 pages).",
      createdAt: hoursAgo(50),
    },
    { id: "demo-qm-manga-2", author: "Léa", isAdmin: false, fromDiscord: false, body: "Parfait, merci !", createdAt: hoursAgo(49) },
  ],
  "demo-question-tome": [
    {
      id: "demo-qm-tome-1",
      author: "Nour",
      isAdmin: false,
      fromDiscord: true,
      body: "Je me pose la même question pour une intégrale de 900 pages…",
      createdAt: hoursAgo(20),
    },
    {
      id: "demo-qm-tome-2",
      author: "Alycia",
      isAdmin: true,
      fromDiscord: true,
      body: "Chaque tome compte comme une lecture séparée. Une intégrale se déclare en une seule lecture, avec son nombre de pages total.",
      createdAt: hoursAgo(18),
    },
  ],
  "demo-question-audio": [
    {
      id: "demo-qm-audio-1",
      author: "Marc",
      isAdmin: false,
      fromDiscord: true,
      body: "Pour moi ça compte, l'idée c'est de lire (ou d'écouter) des histoires 🙂",
      createdAt: hoursAgo(5),
    },
  ],
  "demo-question-dimanche": [],
  "demo-question-equipe": [
    {
      id: "demo-qm-equipe-1",
      author: "Alycia",
      isAdmin: true,
      fromDiscord: false,
      body: "Écris-moi en message privé : je te bascule d'équipe. Les points déjà marqués restent à l'ancienne équipe (ils sont figés à la déclaration).",
      createdAt: hoursAgo(70),
    },
  ],
};

/** Five questions: one pinned, one resolved, one still unanswered. */
export const DEMO_QUESTIONS: FaqQuestionRow[] = [
  {
    id: "demo-question-manga",
    title: "Est-ce qu’un manga compte comme une lecture graphique ?",
    body: "Je viens de finir un tome de 210 pages, je ne sais pas quoi cocher dans le formulaire.",
    status: "ANSWERED",
    pinned: true,
    author: "Léa",
    createdAt: hoursAgo(52),
    messages: 2,
    lastAnswer: { author: "Alycia", body: QUESTION_MESSAGES["demo-question-manga"][0].body },
    discordDeleted: false,
    discordUrl: faqThread(1),
  },
  {
    id: "demo-question-tome",
    title: "Une série en plusieurs tomes, c’est une lecture ou plusieurs ?",
    body: "",
    status: "ANSWERED",
    pinned: false,
    author: "Sara",
    createdAt: hoursAgo(22),
    messages: 2,
    lastAnswer: { author: "Alycia", body: QUESTION_MESSAGES["demo-question-tome"][1].body },
    discordDeleted: false,
    discordUrl: faqThread(2),
  },
  {
    id: "demo-question-audio",
    title: "Les livres audio comptent-ils dans le défi ?",
    body: "J’écoute beaucoup en voiture, ça représente pas mal d’heures.",
    status: "OPEN",
    pinned: false,
    author: "Tom",
    createdAt: hoursAgo(6),
    messages: 1,
    lastAnswer: null,
    discordDeleted: false,
    discordUrl: faqThread(3),
  },
  {
    id: "demo-question-dimanche",
    title: "Pourquoi je ne peux rien ajouter le dimanche soir ?",
    body: "Le bot m’a refusé ma lecture à 19 h 40.",
    status: "OPEN",
    pinned: false,
    author: "Inès",
    createdAt: hoursAgo(2),
    messages: 0,
    lastAnswer: null,
    discordDeleted: false,
    discordUrl: faqThread(4),
  },
  {
    id: "demo-question-equipe",
    title: "Je change d’équipe : que deviennent mes points ?",
    body: "",
    status: "RESOLVED",
    pinned: false,
    author: "Paul",
    createdAt: hoursAgo(72),
    messages: 1,
    lastAnswer: { author: "Alycia", body: QUESTION_MESSAGES["demo-question-equipe"][0].body },
    discordDeleted: false,
    discordUrl: faqThread(5),
  },
];

/** Same questions with their thread, for /demo/faq/[id]. Léa (the demo player) owns the first one. */
export const DEMO_QUESTION_THREADS: QuestionDetailView[] = DEMO_QUESTIONS.map((q) => ({
  id: q.id,
  title: q.title,
  body: q.body,
  status: q.status,
  pinned: q.pinned,
  author: q.author,
  createdAt: q.createdAt,
  discordUrl: q.discordUrl,
  discordDeleted: q.discordDeleted,
  messages: QUESTION_MESSAGES[q.id] ?? [],
  canReply: q.status !== "RESOLVED",
  canResolve: q.status !== "RESOLVED" && q.author === DEMO_PLAYER.name,
  canPin: false,
  canDelete: false,
}));

/** Admin › FAQ: the forum is wired, one question is still unanswered. */
export const DEMO_FAQ_SETUP = {
  guildId: DEMO_GUILD,
  channelId: "972000000000000000",
  roleId: "973000000000000000",
  tags: { open: "t-open", answered: "t-answered", resolved: "t-resolved" },
  channelUrl: `https://discord.com/channels/${DEMO_GUILD}/972000000000000000`,
  adminsWithDiscord: 2,
  lastSyncAt: hoursAgo(0.05),
  inviteUrl: "https://discord.com/oauth2/authorize?client_id=demo&scope=bot%20applications.commands&permissions=268453904",
};

export const DEMO_OPEN_QUESTIONS = DEMO_QUESTIONS.filter((q) => q.status === "OPEN").length;

// ---------------------------------------------------------------------------
// Classement
// ---------------------------------------------------------------------------

export const DEMO_LEADERBOARD: LeaderboardRowView[] = [
  { teamId: "demo-team-herissons", name: "Les Hérissons", color: "#B5533C", points: 260, members: 4, books: 19, graphics: 6, rank: 1 },
  { teamId: "demo-team-renards", name: "Les Renards", color: "#2E4A7D", points: 248.6, members: 4, books: 3, graphics: 4, rank: 2 },
  { teamId: "demo-team-loutres", name: "Les Loutres", color: "#3C7A5E", points: 201.3, members: 3, books: 15, graphics: 2, rank: 3 },
  { teamId: "demo-team-hiboux", name: "Les Hiboux", color: "#7B4B9C", points: 201.3, members: 4, books: 13, graphics: 7, rank: 3 },
];

// ---------------------------------------------------------------------------
// Accueil
// ---------------------------------------------------------------------------

export const DEMO_HOME: Omit<HomeViewProps, "demo"> = {
  userName: DEMO_PLAYER.name,
  team: { name: DEMO_TEAM.name, color: DEMO_TEAM.color },
  challengeName: DEMO_CHALLENGE.name,
  challengeOver: false,
  score: DEMO_TEAM.points,
  rank: { position: 2, total: 4, gapPoints: 11.4, ahead: "Les Hérissons" },
  stats: {
    romans: DEMO_MY_BOOKS.filter((b) => b.type === "ROMAN").length,
    graphiques: DEMO_MY_BOOKS.filter((b) => b.type === "GRAPHIQUE").length,
    myPoints: DEMO_MY_BOOKS.reduce((n, b) => n + b.points, 0),
    teamShare: Math.round((DEMO_MY_BOOKS.reduce((n, b) => n + b.points, 0) / DEMO_TEAM.points) * 100),
  },
  week: {
    vote: { chapter: "chapitre 4", deadline: inHours(31) },
    pendingCells: [{ label: "B2", missing: "il manque ½ graphique (ou un roman)" }],
  },
};

// ---------------------------------------------------------------------------
// Équipe
// ---------------------------------------------------------------------------

export const DEMO_TEAM_VIEW: Omit<TeamViewProps, "demo" | "params" | "setDeputyAction"> = {
  team: { id: DEMO_TEAM.id, name: DEMO_TEAM.name, color: DEMO_TEAM.color },
  captain: "Marc",
  deputy: "Sara",
  total: DEMO_TEAM.points,
  bySource: DEMO_BY_SOURCE,
  members: DEMO_MEMBERS,
  modifiers: [{ id: "demo-mod-1", label: "Bonus de l'histoire", multiplier: 1.5, endAt: inDays(2) }],
  recent: DEMO_LEDGER.slice(0, 5).map((e) => ({ id: e.id, label: e.label, who: e.who, amount: e.amount })),
  canNameDeputy: false,
  currentDeputyId: "demo-user-sara",
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const DEMO_DASHBOARD: Omit<DashboardViewProps, "demo"> = {
  challenge: { name: DEMO_CHALLENGE.name, color: DEMO_CHALLENGE.color, week: DEMO_CHALLENGE.week, weeks: DEMO_CHALLENGE.weeks },
  kpis: {
    books: 87,
    booksLast7: 19,
    points: 911.2,
    activePlayers: 15,
    players: 15,
    nextLeaderboard: "dim. 20:00",
    nextIn: "dans 2 j 6 h",
  },
  todo: [
    { id: "demo-todo-questions", tone: "wait", icon: "❓", text: `${DEMO_OPEN_QUESTIONS} questions sans réponse dans la FAQ.`, href: "/admin/faq" },
    {
      id: "demo-todo-tie",
      tone: "wait",
      icon: "⚖️",
      text: "Les Renards — égalité au chapitre 4, en attente du capitaine depuis 2 h 10 (pause nocturne comptée).",
      href: "/admin/story",
    },
    {
      id: "demo-todo-dormant",
      tone: "no",
      icon: "📖",
      text: "Les Hiboux — chapitre 3 dormant depuis 9 jours (condition : 2 lignes de bingo). Relance envoyée dimanche.",
      href: "/admin/story",
    },
    { id: "demo-todo-weekly", tone: "ok", icon: "✅", text: "Classement du dimanche 20 septembre publié à 20:00 · fenêtre de vérification annoncée et fermée." },
  ],
  leaderboard: DEMO_LEADERBOARD.map((r) => ({ teamId: r.teamId, name: r.name, color: r.color, points: r.points, rank: r.rank })),
  bot: { lastTickLabel: "Dernier tick il y a 4 min (activité)", cron: "cron quotidien 08:00 · 0 erreur sur 7 jours" },
  recentBooks: [
    {
      id: "demo-recent-1",
      when: "il y a 12 min",
      who: "Léa · Renards",
      title: "Le Problème à trois corps — Liu Cixin, 512 p.",
      type: "ROMAN",
      points: 51.2,
      links: "quête #3 ✅ · case D1 ✅",
      deleted: false,
    },
    {
      id: "demo-recent-2",
      when: "il y a 3 h",
      who: "Nour · Hérissons",
      title: "Persepolis — Marjane Satrapi, 372 p.",
      type: "GRAPHIQUE",
      points: 37.2,
      links: "case A1 ½",
      deleted: false,
    },
    {
      id: "demo-recent-3",
      when: "hier 22:41",
      who: "Tom · Loutres",
      title: "Nouvelles orientales — Marguerite Yourcenar, 149 p.",
      type: "GRAPHIQUE",
      points: 7.5,
      links: "",
      deleted: false,
    },
    {
      id: "demo-recent-4",
      when: "hier 19:05",
      who: "Marc · Renards",
      title: "Dune — Frank Herbert, 688 p. (supprimée par le capitaine, doublon)",
      type: null,
      points: -68.8,
      links: "annulation",
      deleted: true,
    },
  ],
};

export const DEMO_CHALLENGE_FORM: ChallengeValues = {
  id: DEMO_CHALLENGE.id,
  name: DEMO_CHALLENGE.name,
  startAt: "2026-09-05",
  endAt: "2026-10-31",
  color: DEMO_CHALLENGE.color,
  pointsPerPage: 0.1,
  bingoLineBonus: 25,
  bingoFullBonus: 100,
  status: "ACTIVE",
  discordGuildId: "1542447740573847643",
  discordGeneralChannelId: "1542449902118453380",
};

export const DEMO_EDITIONS = [
  { id: DEMO_CHALLENGE.id, name: DEMO_CHALLENGE.name, color: DEMO_CHALLENGE.color, period: "5 sept. → 31 oct. 2026", status: "ACTIVE" as const },
  { id: DEMO_ARCHIVE.id, name: DEMO_ARCHIVE.name, color: DEMO_ARCHIVE.color, period: "6 sept. → 31 oct. 2025", status: "FINISHED" as const },
];

const MEMBERS_BY_TEAM: Record<string, { id: string; name: string }[]> = {
  "demo-team-herissons": [
    { id: "demo-user-nour", name: "Nour" },
    { id: "demo-user-elise", name: "Élise" },
    { id: "demo-user-hugo", name: "Hugo" },
    { id: "demo-user-mila", name: "Mila" },
  ],
  "demo-team-renards": [
    { id: "demo-user-marc", name: "Marc" },
    { id: "demo-user-lea", name: "Léa" },
    { id: "demo-user-sara", name: "Sara" },
    { id: "demo-user-yanis", name: "Yanis" },
  ],
  "demo-team-loutres": [
    { id: "demo-user-tom", name: "Tom" },
    { id: "demo-user-rim", name: "Rim" },
    { id: "demo-user-jo", name: "Jo" },
  ],
  "demo-team-hiboux": [
    { id: "demo-user-ines", name: "Inès" },
    { id: "demo-user-paul", name: "Paul" },
    { id: "demo-user-jules", name: "Jules" },
    { id: "demo-user-camille", name: "Camille" },
  ],
};

const slug = (id: string) => id.replace("demo-team-", "");

export const DEMO_ADMIN_TEAMS: AdminTeamRow[] = DEMO_TEAMS.map((t, i) => ({
  id: t.id,
  name: t.name,
  color: t.color,
  members: MEMBERS_BY_TEAM[t.id],
  captain: t.captain,
  captainId: MEMBERS_BY_TEAM[t.id][0].id,
  deputy: t.deputy,
  deputyId: t.deputy ? MEMBERS_BY_TEAM[t.id][1].id : "",
  adventureChannel: `#aventure-${slug(t.id)}`,
  libraryChannel: t.id === "demo-team-hiboux" ? null : `#librairie-${slug(t.id)}`,
  gridLabel: i < 2 ? "2 / 4" : "1 / 4",
  points: t.points,
}));

export const DEMO_ADMIN_PLAYERS: PlayerRow[] = [
  { id: "demo-user-nour", name: "Nour", discordId: "402911870034211187", teamId: "demo-team-herissons", teamName: "Les Hérissons", isCaptain: true, role: "PLAYER", books: 9, isMe: false },
  { id: "demo-user-marc", name: "Marc", discordId: "135118374829104196", teamId: "demo-team-renards", teamName: "Les Renards", isCaptain: true, role: "PLAYER", books: 1, isMe: false },
  { id: "demo-user-lea", name: "Léa", discordId: "881122334455660342", teamId: "demo-team-renards", teamName: "Les Renards", isCaptain: false, role: "PLAYER", books: 4, isMe: false },
  { id: "demo-user-alycia", name: "Alycia", discordId: "135118374829104197", teamId: "", teamName: null, isCaptain: false, role: "ADMIN", books: 0, isMe: true },
  { id: "demo-user-tom", name: "Tom", discordId: "552033445566777781", teamId: "demo-team-loutres", teamName: "Les Loutres", isCaptain: true, role: "PLAYER", books: 6, isMe: false },
];

export const DEMO_ADMIN_INVITES = [
  { id: "demo-invite-1", discordId: "773044556677882210", teamName: "Les Loutres", role: "PLAYER" as const },
  { id: "demo-invite-2", discordId: "910455667788995533", teamName: "Les Hiboux", role: "PLAYER" as const },
];

const progressFor = (indices: { done: number[]; half: number[] }, size: number): GridProgress[] =>
  Array.from({ length: size * size }, (_, i) => (indices.done.includes(i) ? "done" : indices.half.includes(i) ? "half" : "free"));

const RENARDS_PROGRESS: GridProgress[] = DEMO_BOARD_CELLS.map((c) => (c.complete ? "done" : c.weight > 0 ? "half" : "free"));

export const DEMO_ADMIN_GRIDS: AdminGridRow[] = [
  {
    id: "demo-grid-1",
    order: 1,
    title: "Rentrée littéraire",
    size: 5,
    prompts: PROMPTS,
    teams: [
      { teamId: "demo-team-herissons", name: "Les Hérissons", cells: null, completed: true },
      { teamId: "demo-team-renards", name: "Les Renards", cells: null, completed: true },
      {
        teamId: "demo-team-loutres",
        name: "Les Loutres",
        cells: progressFor({ done: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], half: [7] }, 5),
        completed: false,
      },
      { teamId: "demo-team-hiboux", name: "Les Hiboux", cells: progressFor({ done: [0, 1, 2, 5, 6, 7, 10, 11, 15], half: [3] }, 5), completed: false },
    ],
  },
  {
    id: "demo-grid-2",
    order: 2,
    title: "Couleurs d'automne",
    size: 5,
    prompts: PROMPTS,
    teams: [
      { teamId: "demo-team-herissons", name: "Les Hérissons", cells: progressFor({ done: [0, 1, 2, 3, 4, 5, 10, 15], half: [6] }, 5), completed: false },
      { teamId: "demo-team-renards", name: "Les Renards", cells: RENARDS_PROGRESS, completed: false },
      { teamId: "demo-team-loutres", name: "Les Loutres", cells: null, completed: false },
      { teamId: "demo-team-hiboux", name: "Les Hiboux", cells: null, completed: false },
    ],
  },
  {
    id: "demo-grid-3",
    order: 3,
    title: "Voix du monde",
    size: 4,
    prompts: PROMPTS.slice(0, 16),
    teams: DEMO_TEAMS.map((t) => ({ teamId: t.id, name: t.name, cells: null, completed: false })),
  },
  {
    id: "demo-grid-4",
    order: 4,
    title: "Nuit blanche",
    size: 5,
    prompts: PROMPTS,
    teams: DEMO_TEAMS.map((t) => ({ teamId: t.id, name: t.name, cells: null, completed: false })),
  },
];

export const DEMO_ADMIN_QUESTS: AdminQuestRow[] = [
  {
    id: "demo-quest-1",
    number: 1,
    title: "Un livre de moins de 200 pages",
    description: "",
    points: 10,
    openAt: "",
    closeAt: "",
    targetTeamId: "",
    window: "—",
    target: "toutes",
    fromStory: false,
    progress: [
      { teamId: "demo-team-herissons", team: "Les Hérissons", state: "done" },
      { teamId: "demo-team-loutres", team: "Les Loutres", state: "done" },
      { teamId: "demo-team-renards", team: "Les Renards", state: "half" },
    ],
  },
  {
    id: "demo-quest-2",
    number: 2,
    title: "Un classique du XIXᵉ",
    description: "",
    points: 20,
    openAt: "2026-10-01T00:00",
    closeAt: "",
    targetTeamId: "",
    window: "ouvre le 1 oct.",
    target: "toutes",
    fromStory: false,
    progress: [],
  },
  {
    id: "demo-quest-3",
    number: 3,
    title: "Un roman traduit d'une langue asiatique",
    description: "",
    points: 20,
    openAt: "",
    closeAt: "",
    targetTeamId: "",
    window: "—",
    target: "toutes",
    fromStory: false,
    progress: [
      { teamId: "demo-team-renards", team: "Les Renards", state: "done" },
      { teamId: "demo-team-hiboux", team: "Les Hiboux", state: "done" },
    ],
  },
  {
    id: "demo-quest-4",
    number: 4,
    title: "Un livre conseillé par un autre membre",
    description: "",
    points: 15,
    openAt: "",
    closeAt: "2026-09-30T23:59",
    targetTeamId: "",
    window: "→ 30 sept.",
    target: "toutes",
    fromStory: false,
    progress: [{ teamId: "demo-team-herissons", team: "Les Hérissons", state: "done" }],
  },
  {
    id: "demo-quest-6",
    number: 6,
    title: "Défi des Hérissons : un recueil de nouvelles",
    description: "Imposée par le choix des Hérissons au chapitre 3.",
    points: 25,
    openAt: "",
    closeAt: "2026-09-30T23:59",
    targetTeamId: "demo-team-renards",
    window: "6 jours",
    target: "Les Renards",
    fromStory: true,
    progress: [],
  },
];

export const DEMO_ADMIN_STORY: EditorStory = {
  id: "demo-story",
  title: "La Bibliothèque sans fin",
  voteHours: 48,
  startNodeId: "demo-node-hall",
  nodes: [
    {
      id: "demo-node-hall",
      title: "Le hall d'entrée",
      body: "Les portes se referment derrière vous. Un chat roux vous observe depuis le comptoir.",
      sortOrder: 0,
      requiredQuestId: null,
      requiredBingoLines: null,
      requiredPoints: null,
      voteHours: 48,
      defaultChoiceId: null,
      teamsHere: 0,
      alerts: [],
      choices: [
        {
          id: "demo-choice-chat",
          label: "Suivre le chat",
          targetNodeId: "demo-node-escalier",
          targetTitle: "L'escalier de pierre",
          lockedByQuestId: null,
          lockedByQuestTitle: null,
          sortOrder: 0,
          effects: "[]",
          effectLabels: [],
        },
        {
          id: "demo-choice-registre",
          label: "Ouvrir le registre",
          targetNodeId: "demo-node-bureau",
          targetTitle: "Le bureau",
          lockedByQuestId: null,
          lockedByQuestTitle: null,
          sortOrder: 1,
          effects: '[{"type":"points","target":"self","amount":10}]',
          effectLabels: ["+10 pts pour l'équipe"],
        },
      ],
    },
    {
      id: "demo-node-jardin",
      title: "Le jardin d'hiver",
      body: "Sous la verrière, les livres poussent comme des plantes.",
      sortOrder: 1,
      requiredQuestId: null,
      requiredBingoLines: 2,
      requiredPoints: null,
      voteHours: null,
      defaultChoiceId: null,
      teamsHere: 1,
      alerts: [{ id: "demo-alert-dormant", tone: "no", icon: "📖", text: "Les Hiboux sont bloqués ici depuis 9 jours (1 ligne sur 2)." }],
      choices: [],
    },
    {
      id: "demo-node-cartes",
      title: "La salle des cartes",
      body: "Les étagères s'écartent sur une salle circulaire…",
      sortOrder: 2,
      requiredQuestId: null,
      requiredBingoLines: null,
      requiredPoints: null,
      voteHours: 36,
      defaultChoiceId: "demo-choice-gauche",
      teamsHere: 1,
      alerts: [
        {
          id: "demo-alert-tie",
          tone: "wait",
          icon: "⚖️",
          text: "Les Renards : égalité 2 – 2, capitaine sollicité il y a 2 h 10. À trancher en tant qu'admin depuis la page Histoire de l'équipe.",
        },
      ],
      choices: [
        {
          id: "demo-choice-gauche",
          label: "Le couloir de gauche",
          targetNodeId: "demo-node-lanterne",
          targetTitle: "La lanterne",
          lockedByQuestId: null,
          lockedByQuestTitle: null,
          sortOrder: 0,
          effects: '[{"type":"points","target":"self","amount":15}]',
          effectLabels: ["+15 pts pour l'équipe"],
        },
        {
          id: "demo-choice-droite",
          label: "Le couloir de droite",
          targetNodeId: "demo-node-voix",
          targetTitle: "Les voix",
          lockedByQuestId: null,
          lockedByQuestTitle: null,
          sortOrder: 1,
          effects: '[{"type":"steal","target":"chosen","amount":20}]',
          effectLabels: ["Vole 20 pts à l'équipe choisie"],
        },
        {
          id: "demo-choice-runes",
          label: "Déplier la carte et lire les runes",
          targetNodeId: "demo-node-runes",
          targetTitle: "Les runes",
          lockedByQuestId: "demo-quest-2",
          lockedByQuestTitle: "Un classique du XIXᵉ",
          sortOrder: 2,
          effects: "[]",
          effectLabels: [],
        },
      ],
    },
  ],
};

export const DEMO_ADMIN_STORY_TEAMS: TeamStoryRow[] = [
  { teamId: "demo-team-herissons", name: "Les Hérissons", color: "#B5533C", chapter: "La lanterne", status: { tone: "type", label: "action" }, hasState: true },
  { teamId: "demo-team-renards", name: "Les Renards", color: "#2E4A7D", chapter: "La salle des cartes", status: { tone: "wait", label: "égalité" }, hasState: true },
  { teamId: "demo-team-loutres", name: "Les Loutres", color: "#3C7A5E", chapter: "L'escalier de pierre", status: { tone: "ok", label: "vote · 4/3" }, hasState: true },
  { teamId: "demo-team-hiboux", name: "Les Hiboux", color: "#7B4B9C", chapter: "Le jardin d'hiver", status: { tone: "no", label: "dormant 9 j" }, hasState: true },
];

export const DEMO_ADMIN_QUEST_TEAMS = DEMO_TEAMS.map((t) => ({ id: t.id, name: t.name }));

// ---------------------------------------------------------------------------
// Admin › Lectures (supervision, REDESIGN §9.1)
// ---------------------------------------------------------------------------

const updatedFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const editedBy = (who: string, days: number) => `${who} · ${updatedFmt.format(daysAgo(days))}`;

/**
 * Every reading of the demo challenge, as the admin table shows them
 * (`declaredGraphic`, `questId` and `cellId` feed the edit modal).
 */
export const DEMO_READINGS_ADMIN: (AdminReadingRow & { userId: string; teamId: string; declaredGraphic: boolean; questId: string; cellId: string })[] = [
  {
    id: "demo-book-trois-corps",
    userId: "demo-user-lea",
    teamId: "demo-team-renards",
    finishedAt: daysAgo(1),
    teamName: "Les Renards",
    teamColor: "#2E4A7D",
    owner: "Léa",
    title: "Le Problème à trois corps",
    author: "Liu Cixin",
    pages: 512,
    type: "ROMAN",
    declaredGraphic: false,
    points: 51.2,
    questNumber: 3,
    questHalf: false,
    questId: "demo-quest-3",
    cellLabel: "D1",
    cellHalf: false,
    cellId: "demo-cell-3",
    updatedLabel: editedBy("Léa", 1),
    deleted: false,
  },
  {
    id: "demo-book-persepolis-nour",
    userId: "demo-user-nour",
    teamId: "demo-team-herissons",
    finishedAt: daysAgo(2),
    teamName: "Les Hérissons",
    teamColor: "#B5533C",
    owner: "Nour",
    title: "Persepolis",
    author: "Marjane Satrapi",
    pages: 372,
    type: "GRAPHIQUE",
    declaredGraphic: true,
    points: 37.2,
    questNumber: null,
    questHalf: true,
    questId: "",
    cellLabel: "A1",
    cellHalf: true,
    cellId: "demo-cell-0",
    updatedLabel: editedBy("Nour", 2),
    deleted: false,
  },
  {
    id: "demo-book-blacksad",
    userId: "demo-user-lea",
    teamId: "demo-team-renards",
    finishedAt: daysAgo(3),
    teamName: "Les Renards",
    teamColor: "#2E4A7D",
    owner: "Léa",
    title: "Blacksad, t. 1",
    author: "Díaz Canales & Guarnido",
    pages: 56,
    type: "GRAPHIQUE",
    declaredGraphic: true,
    points: 2.8,
    questNumber: null,
    questHalf: true,
    questId: "",
    cellLabel: "B2",
    cellHalf: true,
    cellId: "demo-cell-6",
    updatedLabel: editedBy("Marc", 2),
    deleted: false,
  },
  {
    id: "demo-book-watchmen",
    userId: "demo-user-ines",
    teamId: "demo-team-hiboux",
    finishedAt: daysAgo(3),
    teamName: "Les Hiboux",
    teamColor: "#7B4B9C",
    owner: "Inès",
    title: "Watchmen",
    author: "Alan Moore & Dave Gibbons",
    pages: 416,
    type: "GRAPHIQUE",
    declaredGraphic: true,
    points: 41.6,
    questNumber: null,
    questHalf: true,
    questId: "",
    cellLabel: "D2",
    cellHalf: true,
    cellId: "demo-cell-8",
    updatedLabel: editedBy("Inès", 3),
    deleted: false,
  },
  {
    id: "demo-book-horde",
    userId: "demo-user-elise",
    teamId: "demo-team-herissons",
    finishedAt: daysAgo(4),
    teamName: "Les Hérissons",
    teamColor: "#B5533C",
    owner: "Élise",
    title: "La Horde du Contrevent",
    author: "Alain Damasio",
    pages: 704,
    type: "ROMAN",
    declaredGraphic: false,
    points: 70.4,
    questNumber: 1,
    questHalf: false,
    questId: "demo-quest-1",
    cellLabel: "C3",
    cellHalf: false,
    cellId: "demo-cell-12",
    updatedLabel: editedBy("Élise", 4),
    deleted: false,
  },
  {
    id: "demo-book-rose",
    userId: "demo-user-marc",
    teamId: "demo-team-renards",
    finishedAt: daysAgo(5),
    teamName: "Les Renards",
    teamColor: "#2E4A7D",
    owner: "Marc",
    title: "Le Nom de la rose",
    author: "Umberto Eco",
    pages: 640,
    type: "ROMAN",
    declaredGraphic: false,
    points: 64,
    questNumber: null,
    questHalf: false,
    questId: "",
    cellLabel: "A1",
    cellHalf: false,
    cellId: "demo-cell-0",
    updatedLabel: editedBy("Marc", 5),
    deleted: false,
  },
  {
    id: "demo-book-prince",
    userId: "demo-user-tom",
    teamId: "demo-team-loutres",
    finishedAt: daysAgo(6),
    teamName: "Les Loutres",
    teamColor: "#3C7A5E",
    owner: "Tom",
    title: "Le Petit Prince",
    author: "Antoine de Saint-Exupéry",
    pages: 126,
    type: "GRAPHIQUE",
    declaredGraphic: false,
    points: 6.3,
    questNumber: 1,
    questHalf: true,
    questId: "demo-quest-1",
    cellLabel: null,
    cellHalf: false,
    cellId: "",
    updatedLabel: editedBy("Tom", 6),
    deleted: false,
  },
  {
    id: "demo-book-chanson",
    userId: "demo-user-sara",
    teamId: "demo-team-renards",
    finishedAt: daysAgo(7),
    teamName: "Les Renards",
    teamColor: "#2E4A7D",
    owner: "Sara",
    title: "Chanson douce",
    author: "Leïla Slimani",
    pages: 127,
    type: "GRAPHIQUE",
    declaredGraphic: false,
    points: 6.4,
    questNumber: null,
    questHalf: true,
    questId: "",
    cellLabel: "E1",
    cellHalf: true,
    cellId: "demo-cell-4",
    updatedLabel: editedBy("Sara", 7),
    deleted: false,
  },
  {
    id: "demo-book-etranger",
    userId: "demo-user-hugo",
    teamId: "demo-team-herissons",
    finishedAt: daysAgo(8),
    teamName: "Les Hérissons",
    teamColor: "#B5533C",
    owner: "Hugo",
    title: "L'Étranger",
    author: "Albert Camus",
    pages: 184,
    type: "ROMAN",
    declaredGraphic: false,
    points: 18.4,
    questNumber: 4,
    questHalf: false,
    questId: "demo-quest-4",
    cellLabel: null,
    cellHalf: false,
    cellId: "",
    updatedLabel: editedBy("Nour", 7),
    deleted: false,
  },
  {
    id: "demo-book-kafka",
    userId: "demo-user-rim",
    teamId: "demo-team-loutres",
    finishedAt: daysAgo(10),
    teamName: "Les Loutres",
    teamColor: "#3C7A5E",
    owner: "Rim",
    title: "Kafka sur le rivage",
    author: "Haruki Murakami",
    pages: 618,
    type: "ROMAN",
    declaredGraphic: false,
    points: 61.8,
    questNumber: 3,
    questHalf: false,
    questId: "demo-quest-3",
    cellLabel: "B1",
    cellHalf: false,
    cellId: "demo-cell-1",
    updatedLabel: editedBy("Rim", 10),
    deleted: false,
  },
  {
    id: "demo-book-nouvelles",
    userId: "demo-user-paul",
    teamId: "demo-team-hiboux",
    finishedAt: daysAgo(12),
    teamName: "Les Hiboux",
    teamColor: "#7B4B9C",
    owner: "Paul",
    title: "Nouvelles orientales",
    author: "Marguerite Yourcenar",
    pages: 149,
    type: "GRAPHIQUE",
    declaredGraphic: false,
    points: 7.5,
    questNumber: null,
    questHalf: true,
    questId: "",
    cellLabel: null,
    cellHalf: false,
    cellId: "",
    updatedLabel: editedBy("Paul", 12),
    deleted: false,
  },
  {
    id: "demo-book-dune",
    userId: "demo-user-marc",
    teamId: "demo-team-renards",
    finishedAt: daysAgo(2),
    teamName: "Les Renards",
    teamColor: "#2E4A7D",
    owner: "Marc",
    title: "Dune",
    author: "Frank Herbert",
    pages: 688,
    type: "ROMAN",
    declaredGraphic: false,
    points: 68.8,
    questNumber: null,
    questHalf: false,
    questId: "",
    cellLabel: null,
    cellHalf: false,
    cellId: "",
    updatedLabel: editedBy("Alycia", 1),
    deleted: true,
  },
];

/** Filter dropdowns of Admin › Lectures. */
export const DEMO_ADMIN_READERS = Object.values(MEMBERS_BY_TEAM)
  .flat()
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

/** Quest / cell choices offered by the demo edit modal (same wording as lib/services/autocomplete). */
export const DEMO_QUEST_CHOICES = DEMO_ADMIN_QUESTS.filter((q) => !q.openAt || new Date(q.openAt) <= new Date()).map((q) => ({
  value: q.id,
  name: `#${q.number} — ${q.title} — ${q.points} pts`,
}));

export const DEMO_CELL_CHOICES = DEMO_BOARD_CELLS.filter((c) => !c.complete).map((c) => ({
  value: c.id,
  name: `${c.label} — ${c.prompt}${c.weight > 0 ? " (½ fait)" : ""}`,
}));
