/**
 * Kyle's guided tours — pure data, client-safe (no `server-only`): the same
 * steps drive the public demo (`/demo?tour=player`) and the first login
 * (`/home?tour=player`).
 *
 * The tour state lives in the URL (`?tour=player&step=3`) so it survives a
 * navigation, a reload and can be shared. `body` uses the same `**gras**`
 * markup as `lib/discord/help.ts`, rendered by `<Rich>`.
 */

export type TourId = "player" | "admin";

export type TourStep = {
  /** Stable id, used for the progress dots and debugging. */
  id: string;
  /** Route of the real app; `resolvePath` maps it onto the demo. */
  path: string;
  /** `data-tour` attribute to spotlight; without it the bubble is centred. */
  target?: string;
  title: string;
  body: string;
  /** Preferred side of the target on wide screens (mobile is always bottom). */
  placement?: "top" | "bottom";
};

const PLAYER: TourStep[] = [
  {
    id: "home-score",
    path: "/home",
    target: "home-score",
    title: "Salut, moi c’est Kyle",
    body: "Je t’accompagne pendant le défi. Ici, c’est le **score de ton équipe** : la somme des points de tous ses membres, et votre place au classement.",
  },
  {
    id: "home-add",
    path: "/home",
    target: "home-add",
    title: "Tu as fini un livre ?",
    body: "Déclare-le ici, ou avec **/ajouter-un-livre** dans le salon *librairie* de ton équipe. Barème : **pages ÷ 10** — 412 pages font 41,2 points. Sous 150 pages, la lecture compte comme un graphique : moitié des points.",
  },
  {
    id: "books-list",
    path: "/books",
    target: "books-list",
    title: "Tes lectures",
    body: "Toutes tes lectures et celles de l’équipe. Tu peux corriger une lecture pendant **1 h** après l’avoir ajoutée ; ensuite, seul·e le·la capitaine (ou un·e organisateur·ice) peut le faire.",
  },
  {
    id: "bingo-board",
    path: "/bingo",
    target: "bingo-board",
    title: "Le bingo, à plusieurs",
    body: "Une grille à la fois, commune à toute l’équipe. Un **roman** valide une case à lui seul ; un **graphique** vaut ½ case, il en faut donc deux — même lus par deux personnes différentes. Grille terminée : la suivante s’ouvre.",
  },
  {
    id: "quests-list",
    path: "/quests",
    target: "quests-list",
    title: "Les quêtes",
    body: "Des défis de lecture proposés par les organisateurs, validés par une lecture (½ pour un graphique). Une lecture valide au plus **une** quête et **une** case.",
  },
  {
    id: "story-chapter",
    path: "/story",
    target: "story-chapter",
    title: "Votre histoire",
    body: "Chaque chapitre se termine par un choix, voté ici ou sur Discord. Quorum de **3 votants** (ou toute l’équipe si elle est plus petite) ; tu peux changer ton vote jusqu’à la clôture.",
  },
  {
    id: "leaderboard-list",
    path: "/leaderboard",
    target: "leaderboard-list",
    title: "Le classement",
    body: "Mis à jour en direct. Chaque **dimanche de 19 h à 21 h**, les ajouts sont suspendus le temps de la vérification, et le classement de la semaine est publié à **20 h**.",
  },
  {
    id: "help-discord",
    path: "/help",
    target: "help-discord",
    title: "Et sur Discord ?",
    body: "Les mêmes actions, sans quitter la conversation : **/ajouter-un-livre**, **/score**, **/quete**, **/bingo**, **/histoire**, **/help**. Les commandes de lecture ne marchent que dans le salon *librairie* de ton équipe.",
  },
  {
    id: "help-sections",
    path: "/help",
    target: "help-sections",
    title: "À toi de jouer !",
    body: "Toutes les règles sont ici, et je reste dans le coin. Bonnes lectures — et n’oublie pas : je suis jaune, mais je ne plaisante pas avec les ½ crédits.",
  },
];

const ADMIN: TourStep[] = [
  {
    id: "admin-dashboard",
    path: "/admin",
    target: "admin-dashboard",
    title: "Le poste de pilotage",
    body: "Tout l’état du défi d’un coup d’œil : lectures déclarées, points distribués, joueurs actifs, et la liste **À traiter** qui te dit quoi faire ensuite. Sur un défi tout neuf, la carte **Prochaines étapes** de l’écran Défi coche ce qui est fait et pointe ce qui reste.",
  },
  {
    id: "challenge-form",
    path: "/admin/challenge",
    target: "challenge-form",
    title: "1. Régler l’édition",
    body: "Nom, dates, couleur et barème. Si tu viens de **/challenger creer**, tout est déjà rempli et le serveur déjà câblé : tu n’es ici que pour ajuster. Plusieurs éditions coexistent ; un serveur n’accueille qu’un défi **actif** à la fois.",
  },
  {
    id: "teams-table",
    path: "/admin/teams",
    target: "teams-table",
    title: "2. Les équipes",
    body: "Une couleur par équipe (elle sert au rôle Discord), un·e capitaine et un·e adjoint·e pour trancher les égalités de vote. **Renomme sans crainte : le serveur suit** — le rôle et la catégorie sont renommés avec l’équipe. Une équipe ajoutée ici obtient ses salons toute seule.",
  },
  {
    id: "challenge-discord",
    path: "/admin/challenge",
    target: "challenge-discord",
    title: "3. Le serveur Discord",
    body: "Depuis Discord, **/challenger creer** a déjà tout fait. Sinon : colle l’identifiant du serveur, **invite Kyle**, puis **Configure**. Je crée le rôle *Organisateurs*, la catégorie du défi avec *#annonces-défi* et le forum *#faq*, et une catégorie par équipe. **Configurer ne crée que ce qui manque** : relance-le quand tu veux.",
  },
  {
    id: "players-invites",
    path: "/admin/players",
    target: "players-invites",
    title: "4. Inviter les joueurs",
    body: "Personne ne rejoint un défi de lui-même : c’est toi qui invites. **Tape le pseudo**, choisis la personne dans la liste du serveur, son équipe et son rôle — l’identifiant Discord n’est plus qu’un repli. Kyle lui écrit en privé ; l’invitation s’applique à sa prochaine connexion, et tout de suite si elle a déjà un compte. Depuis Discord : **/inviter**.",
  },
];

export const TOURS: Record<TourId, TourStep[]> = { player: PLAYER, admin: ADMIN };

export const TOUR_PARAM = "tour";
export const STEP_PARAM = "step";

export function isTourId(v: unknown): v is TourId {
  return v === "player" || v === "admin";
}

/** Keeps a step index inside the tour (a hand-edited URL never breaks the guide). */
export function clampStep(tour: TourId, step: number): number {
  const max = TOURS[tour].length - 1;
  if (!Number.isFinite(step)) return 0;
  return Math.min(Math.max(Math.trunc(step), 0), max);
}

/** Maps a real route onto the demo: `/home` → `/demo`, `/admin/teams` → `/demo/admin/teams`. */
export function resolvePath(path: string, base: "" | "/demo"): string {
  if (!base) return path;
  return path === "/home" ? base : `${base}${path}`;
}

/** URL carrying the tour state, ready for `router.push`. */
export function tourHref(tour: TourId, step: number, base: "" | "/demo"): string {
  const n = clampStep(tour, step);
  return `${resolvePath(TOURS[tour][n].path, base)}?${TOUR_PARAM}=${tour}&${STEP_PARAM}=${n}`;
}

/** sessionStorage key: « Passer » must not re-arm the auto-start on the next page. */
export const skipKey = (tour: TourId) => `kyle-tour-skipped:${tour}`;
