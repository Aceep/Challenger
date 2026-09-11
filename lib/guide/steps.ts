/**
 * The copy of the public guide (`/guide`), as data.
 *
 * Pure module, no I/O: the page renders it, and `steps.test.ts` checks what a
 * reader would otherwise discover the hard way — unique anchors, no emoji (the
 * web pages carry their tone in the typography, never in emoji) and a commands
 * list that really holds every command the prose names.
 *
 * `lines` use the same light markup as `lib/discord/help.ts` — `**gras**` and
 * `*italique*` — rendered by `<Rich>`.
 */

export type GuideStep = {
  /** Anchor of the step: `/guide#ajouter-kyle`. Unique across both lists. */
  id: string;
  title: string;
  lines: string[];
  /** Commands quoted by `lines`, shown as a block under them. */
  commands?: string[];
  /**
   * Screen capture illustrating the step, served from `public/guide/<id>.png`
   * (e.g. `/guide/ajouter-kyle.png`). Left undefined until the capture exists:
   * the page renders a `<figure>` only for the steps that have one.
   */
  screenshot?: string;
  /** Alternative text of the capture — required as soon as `screenshot` is set. */
  screenshotAlt?: string;
};

/** « Lancer un défi en dix minutes » — the path of the person who opens an edition. */
export const ORGANIZER_STEPS: GuideStep[] = [
  {
    id: "ce-qu-il-te-faut",
    title: "Ce qu’il te faut",
    lines: [
      "Un **serveur Discord** sur lequel tu as la permission « Gérer le serveur » — le tien, ou celui d’une communauté qui te la donne.",
      "Un **compte Discord** : c’est la seule identité du site, il n’y a pas de mot de passe à créer.",
      "**Dix minutes**, et rien à installer : Kyle est un bot, il vit dans ton serveur, et le site s’ouvre dans un navigateur.",
      "Tu peux tout faire à l’avance : tant que tu n’invites personne, le défi n’existe que pour toi.",
    ],
  },
  {
    id: "ajouter-kyle",
    title: "Ajouter Kyle à ton serveur",
    lines: [
      "Clique sur **Ajouter Kyle à mon serveur**, choisis ton serveur dans la liste, puis **Autoriser** en laissant les permissions cochées.",
      "Elles servent toutes à quelque chose : créer les rôles et les salons du défi, y écrire, et ouvrir un sujet par question dans le forum.",
      "Kyle t’écrit alors en message privé les étapes à suivre. Si tes messages privés sont fermés, il poste le même mot dans le salon d’accueil du serveur : rien n’est perdu.",
      "Sa commande met parfois quelques minutes — jusqu’à une heure — à apparaître dans Discord. C’est normal, c’est le délai de propagation de Discord.",
    ],
  },
  {
    id: "creer-le-defi",
    title: "Créer le défi, depuis Discord",
    lines: [
      "Dans n’importe quel salon, tape **/challenger creer**. Un formulaire s’ouvre : le nom du défi, sa date de début au format JJ/MM/AAAA, sa durée en semaines, et les équipes — **une par ligne**, avec une couleur facultative après une virgule : *Les Renards, #d97706*.",
      "De deux à douze équipes. Celles qui n’ont pas de couleur en reçoivent une, prise dans une palette lisible sur les deux thèmes de Discord.",
      "Kyle répond « Je prépare… », puis, moins d’une minute plus tard, **« Tout est prêt »** : l’édition, le rôle *Organisateurs* qu’il te donne, la **catégorie du défi** contenant **#annonces-défi** et le forum **#faq**, et une catégorie par équipe avec ses salons **#aventure** et **#librairie**.",
      "La commande est réservée aux personnes qui ont « Gérer le serveur » : c’est un geste qui engage tout le serveur. Un serveur n’accueille qu’un défi en cours à la fois.",
      "Si **/challenger** n’apparaît pas encore dans Discord, attends quelques minutes : c’est le délai de propagation des commandes. Tu peux aussi partir du site, sans Discord, avec **Créer mon défi** : tu colleras l’identifiant du serveur plus tard.",
    ],
    commands: ["/challenger creer"],
  },
  {
    id: "equipes-et-salons",
    title: "Les équipes, sur le site",
    lines: [
      "Sur le site, **Se connecter avec Discord** te mène à l’espace organisation : tes équipes y sont déjà, telles que tu les as écrites dans le formulaire.",
      "Dans **Équipes**, désigne le·la capitaine et l’adjoint·e une fois les personnes arrivées : ils tranchent les égalités de vote et corrigent les lectures de leur équipe.",
      "**Ajoute ou renomme une équipe ici, et le serveur suit.** Kyle crée le rôle, la catégorie et les deux salons qui manquent, et renomme ceux qui ont changé de nom.",
      "Supprimer une équipe, en revanche, ne détruit rien sur Discord : ses salons restent, avec ce qui s’y est dit ; à toi de les ranger si tu le souhaites.",
      "Dans **Défi**, le bouton **Configurer le serveur Discord** rattrape tout ce qui manquerait : il ne crée que ce qui n’existe pas, et se relance autant de fois que tu veux. C’est aussi lui qui fait tout le travail si tu es parti·e du site plutôt que de Discord, une fois l’identifiant du serveur collé et Kyle invité.",
    ],
  },
  {
    id: "inviter",
    title: "Inviter tes lecteur·ices",
    lines: [
      "Personne ne rejoint un défi tout seul : c’est toujours l’organisation qui invite.",
      "Le plus rapide est sur Discord : **/inviter** puis, dans *membre1*, la personne choisie dans la liste du serveur — aucun identifiant à copier. *membre2* à *membre5* en invitent cinq d’un coup, *equipe* fixe leur équipe et *role* permet de nommer un·e co-organisateur·ice.",
      "La commande est réservée aux **organisateur·ices du défi** — ce n’est pas une permission Discord : un·e co-organisateur·ice invite sans être admin du serveur.",
      "Sur le site, **Joueurs** fait la même chose : tape le pseudo, choisis la personne, son équipe et son rôle. Le champ « identifiant Discord » reste là, replié, pour inviter quelqu’un qui n’est pas encore sur le serveur.",
      "Kyle écrit à chaque personne en privé : à quoi elle est invitée, où se connecter, et son équipe. La liste des invitations en attente dit si le message est bien parti.",
      "L’invitation prend effet à la **prochaine connexion**, et **tout de suite** si la personne a déjà un compte : elle n’a rien à faire, son défi l’attend sur l’accueil. Ses rôles Discord lui sont posés dès qu’elle est sur le serveur.",
    ],
    commands: ["/inviter"],
  },
  {
    id: "regler-le-jeu",
    title: "Régler le jeu : bingo, quêtes, histoire",
    lines: [
      "**Bingo** : les grilles forment une série. Chaque équipe joue la même grille, et la suivante s’ouvre quand toutes ses cases sont validées.",
      "**Quêtes** : d’équipe, numérotées, avec une fenêtre d’ouverture facultative et un nombre de points à toi.",
      "**Histoire** : un arbre de chapitres, des choix votés, et de vrais effets — points gagnés ou volés, multiplicateurs, quêtes imposées, alliances.",
      "**FAQ** : les questions posées sur le site et sur Discord se rejoignent au même endroit ; les meilleures réponses s’épinglent en haut de la page.",
      "Le bouton **Revoir la visite guidée** te repromène dans les écrans quand tu veux.",
    ],
  },
  {
    id: "pendant-le-defi",
    title: "Pendant le défi",
    lines: [
      "Kyle annonce tout seul : les lectures déclarées, les votes de l’histoire, les changements de leader, le classement du dimanche.",
      "Ton tableau de bord garde la liste de ce qui t’attend : lectures à regarder, questions sans réponse, votes bloqués.",
      "Les lectures ne se valident pas une par une : les points arrivent tout de suite, et la vérification est hebdomadaire. Le règlement tient sur la confiance, avec un historique complet derrière.",
      "**/score** affiche le classement sans quitter Discord.",
    ],
    commands: ["/score"],
  },
  {
    id: "le-dimanche",
    title: "Le dimanche, de 19 h à 21 h",
    lines: [
      "C’est la **fenêtre de vérification** : les joueur·euses ne peuvent plus ajouter, modifier ni supprimer une lecture. L’organisation, elle, garde la main.",
      "Les capitaines relisent les lectures de leur équipe pendant ce temps-là.",
      "Le **classement** est publié à 20 h dans **#annonces-défi**, et le délai d’une heure de correction des lectures est mis en pause pendant toute la fenêtre.",
    ],
  },
  {
    id: "apres-le-defi",
    title: "Après le défi, la saison suivante",
    lines: [
      "À la fin, passe l’édition en **Terminé** dans **Défi** : elle reste consultable, son classement est figé, et le serveur redevient libre.",
      "**C’est l’ordre qui compte :** tant que l’ancienne édition n’est pas *Terminé*, un nouveau **/challenger creer** sur le même serveur répondra qu’un défi y tourne déjà.",
      "La nouvelle saison a **sa propre catégorie**, à son nom, avec ses **#annonces-défi** et son **#faq** ; les anciennes restent en place, avec tout ce qui s’y est dit.",
      "Une équipe qui reprend le **même nom** retrouve son rôle et sa catégorie : rien n’est recréé en double, et les lecteur·ices gardent leurs salons.",
      "Le sélecteur d’édition, en haut de l’écran, permet de passer de l’une à l’autre — on peut jouer une édition et en organiser une autre.",
    ],
    commands: ["/challenger creer"],
  },
];

/** « Rejoindre et jouer » — the path of someone who was invited. */
export const PLAYER_STEPS: GuideStep[] = [
  {
    id: "ton-invitation",
    title: "Ton invitation",
    lines: [
      "Un·e organisateur·ice t’invite : il n’y a rien à demander, et rien à installer.",
      "**Kyle t’écrit en message privé sur Discord** : le nom du défi, ton équipe si elle est déjà choisie, et le lien pour te connecter. Si tes messages privés sont fermés, tu ne recevras rien : va sur le site, tout t’y attend quand même.",
      "Clique sur **Se connecter avec Discord**, autorise l’application : ton édition et ton équipe sont déjà choisies.",
      "Déjà connecté·e au moment de l’invitation ? Rien à faire non plus : reviens sur l’accueil, ton défi y apparaît. Tes salons et ton rôle arrivent sur le serveur dans la foulée.",
      "Sur le téléphone, **Aide et règles › Installer l’app** ajoute Challenger à ton écran d’accueil, comme une vraie application.",
    ],
  },
  {
    id: "tes-salons",
    title: "Tes salons sur Discord",
    lines: [
      "Ton équipe a deux salons, visibles d’elle seule : **#librairie** pour déclarer tes lectures, **#aventure** pour l’histoire, les votes et les annonces.",
      "Le salon **#annonces-défi** réunit tout le monde : classement du dimanche, annonces de l’organisation. On y lit, on n’y écrit pas.",
      "Le forum **#faq** accueille les questions et leurs réponses. Les trois vivent dans la catégorie au nom du défi.",
    ],
  },
  {
    id: "declarer-une-lecture",
    title: "Déclarer une lecture",
    lines: [
      "Le plus simple : le bouton **J’ai fini un livre**, épinglé dans ta librairie. Un formulaire, puis des menus pour le type, la quête et la case.",
      "Sinon **/ajouter-un-livre**, ou le site, dans **Mes lectures**.",
      "Les points tombent tout de suite : pages ÷ 10, et la moitié sous 150 pages (149 p. → 7,5 pts).",
      "Tu peux corriger ta lecture pendant **une heure**. Ensuite, ton·ta capitaine le fait — et l’organisation à tout moment. **/modifier-un-livre** sert aussi à supprimer.",
    ],
    commands: ["/ajouter-un-livre", "/modifier-un-livre"],
  },
  {
    id: "bingo-quetes-histoire",
    title: "Bingo, quêtes et histoire",
    lines: [
      "**/bingo** dessine la grille de ton équipe : cases validées, en attente ½, libres. **/quete** liste les quêtes ouvertes.",
      "Un roman valide seul une case ou une quête ; un graphique ne vaut qu’un demi-crédit, il en faut donc deux — lus par une ou deux personnes de l’équipe.",
      "**/histoire** montre le chapitre en cours. Les choix se votent sur Discord, avec les boutons, ou sur le site ; ton vote reste modifiable jusqu’à la clôture.",
      "Sans majorité à l’échéance, le choix par défaut du chapitre s’applique. En cas d’égalité, le·la capitaine tranche, puis l’adjoint·e.",
    ],
    commands: ["/bingo", "/quete", "/histoire"],
  },
  {
    id: "le-dimanche-joueur",
    title: "Le dimanche, de 19 h à 21 h",
    lines: [
      "Pendant ces deux heures, les lectures ne bougent plus : ni ajout, ni modification, ni suppression. C’est la fenêtre de vérification des capitaines.",
      "Le classement de la semaine est publié à 20 h.",
      "Le délai d’une heure pour corriger une lecture est mis en pause : rien n’expire à cause de la fenêtre.",
    ],
  },
  {
    id: "une-question",
    title: "Une question ?",
    lines: [
      "**/question** ouvre un sujet dans le forum **#faq** et prévient l’organisation. Tout le monde peut répondre dans le fil.",
      "Les réponses écrites sur Discord remontent sur la page **FAQ** du site, et inversement.",
      "**/help** rappelle les commandes et les règles ; la page **Aide et règles** dit exactement la même chose, en plus long.",
    ],
    commands: ["/question", "/help"],
  },
];
