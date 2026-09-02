# Challenger, par Aceep&Kyle

Une plateforme de **défi lecture entre équipes**, jouée moitié sur le web, moitié sur Discord.

N'importe quel compte Discord peut se connecter, ouvrir son propre défi pour sa communauté et y inviter ses joueurs. Les équipes marquent des points en lisant, remplissent des grilles de bingo, complètent des quêtes, et écrivent ensemble une « histoire dont vous êtes le héros » dont chaque chapitre se décide au vote — avec des conséquences bien réelles sur les scores.

**En production : <https://challenger-aceepkyle.vercel.app>**

Le plus rapide pour comprendre le produit est d'ouvrir la **démonstration publique, sans compte ni base de données : [`/demo`](https://challenger-aceepkyle.vercel.app/demo)**. Elle rejoue les vrais écrans, joueur et organisateur, avec des données fictives.

---

## Le jeu

Un défi est une **édition** : des dates de début et de fin, un serveur Discord, des organisateurs, des équipes. Plusieurs éditions tournent en parallèle sans jamais se voir. Une personne appartient à une seule équipe *par édition*, et une équipe a un·e capitaine et un·e adjoint·e.

**Lectures.** Un livre terminé rapporte `pages × 0,1`, soit 1 point pour 10 pages. En dessous de 150 pages, le nombre de pages est d'abord divisé par deux (149 p. → 7,5 pts ; 150 p. → 15 pts). Arrondi commercial à 0,1. Le type effectif est *roman* ou *graphique* (BD, manga… et automatiquement toute lecture de moins de 150 pages).

**Quêtes et bingo.** Les grilles de bingo forment une série ordonnée, commune à toutes les équipes ; chacune en joue une à la fois et débloque la suivante quand toutes ses cases sont validées. Les quêtes sont d'équipe, numérotées, avec une fenêtre d'ouverture éventuelle. Un roman valide seul une quête et/ou une case ; un **graphique ne vaut qu'un demi-crédit** — il en faut deux. Une lecture ne peut valider qu'une quête et qu'une case. Une ligne, une colonne ou une diagonale rapporte un bonus (25 pts par défaut), la grille pleine davantage (100 pts) ; ces bonus sont réversibles, retirer une lecture les annule.

L'antériorité est déclarative, sur la confiance : la lecture doit avoir commencé après la parution de la grille, ou le roman être lu à moins de 50 %.

**L'histoire.** Chaque équipe progresse dans son propre arbre de chapitres, certains verrouillés derrière une quête, un nombre de lignes de bingo ou un total de points. Un chapitre propose des choix, votés sur Discord ou sur le site pendant 48 h par défaut. Quorum de 3 votants (ou tout l'effectif si l'équipe est plus petite), vote modifiable jusqu'à la clôture, résolution anticipée si tout le monde a tranché. Sans majorité à l'échéance, le choix par défaut du chapitre s'applique. En cas d'égalité, une cascade décide : le·la capitaine (5 h), puis l'adjoint·e (5 h), puis n'importe quel membre avec l'accord d'un·e organisateur·rice — les compteurs sont en pause de minuit à 8 h.

Un choix a des **effets de jeu**, sur sa propre équipe, sur une équipe désignée ou sur toutes les autres : gagner ou perdre des points, **voler** des points à une rivale, subir un **multiplicateur** temporaire, se voir **imposer une quête**, ou nouer une **alliance** — les alliés votent alors dans l'histoire les uns des autres.

**Le rythme de la semaine.** La semaine de jeu va du dimanche 21 h au dimanche 19 h suivant (Europe/Paris). Chaque **dimanche de 19 h à 21 h**, une fenêtre de vérification suspend les ajouts, modifications et suppressions de lectures pour tout le monde sauf l'organisation. Le **classement est publié à 20 h** sur Discord. Une lecture reste corrigeable 1 h après son ajout — délai mis en pause pendant la fenêtre — puis seul·e le·la capitaine peut y toucher, et l'organisation à tout moment.

Le score d'une équipe n'est jamais stocké comme un total : c'est la somme d'un **registre d'événements de points en ajout seul**. Une annulation est un événement négatif, un multiplicateur est figé au moment de l'écriture, et l'historique reste lisible.

> Les règles sont rappelées en ligne sur la page **Aide & règles** du site (`/help`) et par la commande `/help` sur Discord — les deux textes sortent du même module, `lib/discord/help.ts`, qui fait donc autorité.

---

## Le site

Connexion **uniquement par Discord** (OAuth). Tout compte Discord peut se connecter : les invitations décident seulement de quels défis on fait partie, jamais de qui a le droit d'entrer.

Un rôle n'existe qu'**à l'intérieur** d'une édition — `ORGANIZER` ou `PLAYER`. On peut donc être joueur ici et organisateur là ; un sélecteur permet de basculer d'une édition à l'autre. L'édition courante est portée par un **cookie**, pas par l'URL : il n'y a donc pas de préfixe `/[challengeId]/…`.

**Espace joueur** (mobile-first, barre de navigation en bas — ces routes sont à la racine, le groupe `(player)` n'ajoute aucun segment d'URL) :

| Route | Écran |
| --- | --- |
| `/home` | Accueil : score de l'équipe, rang et écart avec celle de devant, résumé de la semaine |
| `/books`, `/books/new` | Mes lectures et le formulaire de déclaration, avec autocomplétion des titres |
| `/bingo` | La grille en cours, les bonus obtenus, l'historique des grilles terminées |
| `/quests` | Les quêtes de l'édition, leur état et leur progression (½ compris) |
| `/story` | Le chapitre en cours, le vote de l'équipe, la résolution d'égalité, les alliés et rivaux |
| `/team` | La fiche d'équipe : rôles, répartition des points par source, modificateurs actifs |
| `/leaderboard` | Le classement de l'édition |
| `/faq` | Les questions posées à l'organisation, en miroir du forum Discord |
| `/help` | Aide & règles, et le sélecteur d'édition |
| `/new` | Créer son propre défi — ouvert à tout compte connecté, même sans équipe |

Au premier passage, un **tour guidé** mené par Kyle se superpose aux écrans plutôt que d'imposer une page d'onboarding.

**Espace organisateur** (`/admin`, réservé aux `ORGANIZER` de l'édition, mise en page desktop avec rail latéral) : tableau de bord et to-do, réglages de l'édition et configuration Discord (`/admin/challenge`), équipes, joueurs et invitations, modération des lectures, éditeur de grilles de bingo, de quêtes, d'histoire, et administration de la FAQ.

---

## Le bot Discord

Le bot n'est pas un accessoire : c'est la seconde interface du jeu. Déclarer une lecture, voter, consulter sa grille ou le classement se fait sans quitter Discord. Il n'y a pas de connexion permanente ni de bibliothèque de bot — uniquement l'API REST et des **interactions signées** reçues en HTTP.

### Mettre en place un serveur

L'organisateur crée un serveur vide, y invite le bot avec le lien fourni, puis lance la configuration en un clic depuis `/admin/challenge`. Le bot crée alors ce qui manque, de façon **reprenable** — un second passage ne fait que compléter : le rôle *Organisateurs*, le salon **#général**, une catégorie par équipe avec ses salons **#aventure** (histoire, votes, annonces) et **#librairie** (lectures), et le forum **#faq**. Un mot de bienvenue signé Kyle — la mascotte, un dinosaure jaune intraitable sur les demi-crédits — est épinglé dans chaque salon d'équipe.

Lorsque l'application est ajoutée à un serveur, Discord émet un événement `APPLICATION_AUTHORIZED` et le bot envoie en message privé les trois étapes pour démarrer.

### Les commandes

`/challenger` est enregistrée **globalement** : c'est la seule qui réponde sur un serveur n'ayant pas encore de défi.

| Commande | Ce qu'elle fait |
| --- | --- |
| `/challenger creer` | Crée le défi lecture de ce serveur — réservé à « Gérer le serveur » |
| `/challenger rejoindre` | Rejoint le défi lecture de ce serveur |

Les autres sont enregistrées **par serveur**, au moment de la configuration :

| Commande | Ce qu'elle fait |
| --- | --- |
| `/ajouter-un-livre` | Enregistre une lecture terminée : titre, auteur, pages, type, quête et case |
| `/modifier-un-livre` | Modifie ou supprime une lecture |
| `/score` | Affiche le classement des équipes |
| `/quete` | Liste les quêtes ouvertes et leur avancement |
| `/bingo` | Dessine la grille de l'équipe : cases validées, en attente ½, libres |
| `/histoire` | Montre le chapitre en cours de l'équipe |
| `/question` | Pose une question à l'organisation, qui ouvre un sujet dans le forum **#faq** |
| `/help` | Rappelle les commandes et les règles du défi |

Les deux listes sont tenues disjointes, sans quoi `/challenger` apparaîtrait en double sur les serveurs configurés.

### Au-delà des commandes

- **Le bouton « J'ai fini un livre »**, épinglé dans chaque salon *librairie* : une fenêtre de saisie, puis des menus pour le type, la quête et la case — sans taper une seule commande.
- **Les votes de l'histoire** : le chapitre est posté dans le salon *aventure*, un bouton par choix, un décompte nominatif, les choix verrouillés grisés, et le message réédité à chaque vote.
- **Un pont FAQ bidirectionnel** : une question ouvre un fil dans le forum #faq ; les réponses écrites sur Discord remontent sur la page FAQ du site, et l'état de la question (Ouverte / Répondue / Résolue) se reflète dans les tags du forum.
- **Des annonces automatiques** : ouverture et fermeture de la fenêtre du dimanche, classement hebdomadaire de 20 h, résolution d'un vote, étapes de la cascade d'égalité, rappel aux équipes dont l'histoire s'endort.

---

## La stack

| | |
| --- | --- |
| Framework | **Next.js 16** — App Router, React 19, Server Actions, et `proxy.ts` à la place de `middleware.ts` |
| Langage | TypeScript |
| Base de données | **PostgreSQL Neon**, via **Prisma 7** et l'adaptateur `@prisma/adapter-neon` |
| Authentification | **Auth.js v5** (`next-auth`), Discord uniquement, sessions JWT |
| Styles | **Tailwind CSS 4** |
| Validation | **Zod 4** |
| Discord | API REST v10 et interactions signées (`discord-interactions`) |
| Tests | **Vitest** — les tests unitaires vivent à côté du code (`lib/**/*.test.ts`) |
| Hébergement | **Vercel** (région `iad1`) |

Quelques partis pris structurants, détaillés dans [`CLAUDE.md`](./CLAUDE.md) :

- **L'autorisation vit dans `lib/dal.ts`**, appelée dans chaque page, Server Action et Route Handler — jamais dans un layout ni dans le proxy, qui ne fait qu'une redirection optimiste.
- La **logique de jeu pure** (points, lignes de bingo, résolution des votes, effets d'histoire) est dans `lib/scoring/*` et `lib/story/*`, sans entrées-sorties, et testée unitairement.
- Les Server Actions et les commandes Discord appellent les **mêmes fonctions de service** (`lib/services/*`) : aucune règle métier n'est écrite deux fois.
- Chaque page est un Server Component qui délègue à un composant `*View` pur — c'est ce qui rend la démo possible sans base de données.
- Le multi-tenant est réel : chaque fonction de service reçoit l'édition dans laquelle elle agit, et refuse une équipe ou une invitation venue d'une autre.

---

## Installation locale

### Prérequis

- **Node ≥ 22** — la version est fixée dans [`.nvmrc`](./.nvmrc) : `nvm use`.
- **npm** (ni pnpm ni yarn dans ce dépôt).
- Une base **PostgreSQL** — en pratique, une *branche* Neon dédiée au développement.

### Démarrer

```bash
nvm use
npm install          # « postinstall » lance prisma generate
npm run dev          # http://localhost:3000
```

Le client Prisma est généré dans `lib/generated/prisma`, qui n'est pas versionné : sans `npm install`, rien ne compile. On l'importe depuis `@/lib/generated/prisma/client`, et les enums depuis `@/lib/generated/prisma/enums`.

### Variables d'environnement

Elles se placent dans un `.env.local` (ignoré par git) ; un gabarit est fourni dans [`.env.example`](./.env.example). Pour l'équipe, le projet Vercel est lié (`.vercel/`) et les secrets se récupèrent — et se rafraîchissent — en une commande :

```bash
npx vercel env pull .env.local
```

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL Neon, *pooled*. **Obligatoire** : l'application refuse de démarrer sans elle. |
| `DATABASE_URL_UNPOOLED` | Connexion directe, sans pooler, pour les migrations Prisma. Facultative — `DATABASE_URL` sert de repli. |
| `AUTH_SECRET` | Clé de signature des JWT de session. |
| `AUTH_DISCORD_ID` | Identifiant de l'application Discord : OAuth, lien d'invitation du bot, enregistrement des commandes. |
| `AUTH_DISCORD_SECRET` | Secret client OAuth2 de cette même application. |
| `AUTH_URL` | URL publique de l'application : retour OAuth, et liens insérés dans les messages Discord. |
| `DISCORD_BOT_TOKEN` | Token du bot pour les appels REST — salons, rôles, messages. |
| `DISCORD_PUBLIC_KEY` | Clé publique Ed25519 vérifiant la signature des interactions et des webhooks entrants. Sans elle, ces routes répondent 401. |
| `CRON_SECRET` | Secret protégeant `GET /api/cron/tick` ; la route échoue en 401 tant qu'il n'est pas configuré. |
| `DISCORD_GUILD_ID` | Serveur Discord visé par le seed et par l'enregistrement des commandes. Outillage local uniquement. |
| `ADMIN_DISCORD_ID` | Identifiant Discord du premier organisateur, semé comme invitation. Requis par le seed uniquement. |

Aucune de ces variables n'atteint le navigateur : il n'y a pas un seul `NEXT_PUBLIC_*` dans le dépôt.

### Travailler sans Discord

L'application se lance et se navigue sans aucune configuration Discord : la couche REST se met d'elle-même en sommeil si `DISCORD_BOT_TOKEN` est absent, et [`/demo`](http://localhost:3000/demo) montre tout le produit sans base ni compte.

Pour travailler *sur* l'intégration, il faut en revanche une URL publique : Discord signe ses interactions et les envoie en HTTP à `/api/discord/interactions` et `/api/discord/events`, adresses à déclarer dans le portail développeur (un tunnel type `ngrok` suffit).

### Base de données

> **Prudence.** Le `.env.local` récupéré depuis Vercel pointe vers la base de **production**. Vérifiez toujours l'hôte visé avant une commande destructive, et travaillez sur une branche Neon dédiée.

```bash
npm run db:migrate   # prisma migrate dev
npm run db:seed      # jeu de données de départ (requiert ADMIN_DISCORD_ID)
npm run db:studio    # explorateur Prisma
```

---

## Vérifier son travail

L'intégration continue ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) exécute exactement cette séquence à chaque push :

```bash
npm run lint
npx next typegen     # types de routes générés : sans eux, tsc échoue
npm run typecheck
npm test             # vitest run
npm run build
```

Un fichier de test seul :

```bash
npx vitest run lib/scoring/reading.test.ts
```

---

## Tâches planifiées

Tout ce qui dépend de l'heure — ouverture et fermeture de la fenêtre du dimanche, classement de 20 h (avec rattrapage s'il a été manqué), expiration des votes, cascade d'égalité, rappels aux équipes dormantes — est regroupé dans `runTick` (`lib/services/tick.ts`), idempotent : chaque annonce n'est postée qu'une fois.

Il est déclenché de trois façons : les crons Vercel de [`vercel.json`](./vercel.json), un workflow GitHub Actions horaire ([`.github/workflows/tick.yml`](./.github/workflows/tick.yml)) — le plan Vercel Hobby ne permet que des crons quotidiens et imprécis, alors que le tick veut la minute près — et l'activité des joueurs elle-même, de façon limitée.

---

## Pour aller plus loin

- [`CLAUDE.md`](./CLAUDE.md) — conventions, architecture, et les pièges de Next.js 16 comme de Prisma 7.
- [`docs/REDESIGN.md`](./docs/REDESIGN.md) — les partis pris d'interface.
- La page **Aide & règles** du site, et `lib/discord/help.ts` dont elle est tirée, pour le détail des règles.
