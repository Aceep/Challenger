# Refonte Aceep&Kyle — brief d'implémentation

Ce document est le cahier des charges complet de la refonte du front (joueur + admin) et du mode démo public. Il est destiné à être exécuté tel quel par un agent (Claude Opus 5) ou un·e dev, sans autre contexte que le repo. La maquette validée est `design/prototype.html` (ouvrir dans un navigateur : trois vues, thème clair/sombre) — **c'est la référence visuelle, à reproduire fidèlement**.

Règles de travail : lire `CLAUDE.md` (Node 22 via nvm, Next 16, Prisma 7, autorisation dans `lib/dal.ts`, logique métier dans `lib/services/*`, copie française). Ne pas toucher aux services, au schéma ni à l'endpoint Discord : cette refonte est **purement front + routage + données de démo**. Aucun `dsi:*`.

## 1. Objectifs

1. **Identité Aceep&Kyle** : nouvelle charte (tokens ci-dessous), mascotte Kyle (`public/Kyle.png`), typographies Fraunces + Nunito Sans, thème clair « Papier » / sombre « Encre » suivant le système avec réglage utilisateur.
2. **Plateforme multi-éditions** : le chrome est Aceep&Kyle ; chaque défi (« édition ») apporte sa couleur d'accent (`Challenge.color`, nouveau champ, voir §6) visible sur la bannière d'édition et les couleurs d'équipes.
3. **Site public sans Discord** : landing à `/` pour les visiteurs, **démo joueur** à `/demo` et **démo admin** à `/demo/admin` en données fictives, lecture seule, sans connexion.
4. Tous les écrans joueur (mobile-first) et admin (desktop) refaits selon la maquette, **sans changer les règles ni les services**.

## 2. Charte

### Couleurs (tokens CSS, `app/globals.css`)
| Token | Clair (« Papier ») | Sombre (« Encre ») | Usage |
|---|---|---|---|
| `--kyle` | `#FFD84A` | `#FFD84A` | marque, surlignage, onglet actif |
| `--kyle-deep` | `#F5C400` | `#F5C400` | bordures « en attente », focus |
| `--btn` / `--btn-ink` | `#F5C400` / `#1A1A1F` | `#FFD84A` / `#141518` | boutons primaires |
| `--olive` / `--olive-soft` | `#7C9A2B` / `#E4EBCB` | `#7C9A2B` / `#2E3A1A` | **validé / succès** (crête de Kyle) |
| `--brick` | `#C8553D` | `#C8553D` | refus, suppression, négatif |
| `--hi` | `#FFF2B3` | `#3A3410` | fond « en attente ½ », alertes |
| `--bg` | `#FBF8F0` | `#141518` | fond de page |
| `--surface` / `--surface-2` | `#FFFFFF` / `#F3EEE0` | `#1E2025` / `#26282E` | cartes / champs |
| `--ink` / `--muted` | `#1A1A1F` / `#6B675C` | `#F3EFE4` / `#A39F92` | texte / secondaire |
| `--line` / `--line-strong` | `#E4DDC9` / `#D2C9B0` | `#33363D` / `#43474F` | traits sur le papier / bord d'un objet |
| `--ink-2` | `#3A3833` | `#D8D3C6` | texte secondaire appuyé |
| `--olive-ink` / `--brick-ink` | `#5F7A1C` / `#B3452F` | `#A9C95A` / `#E8836C` | **texte** vert / brique (les aplats gardent `--olive` / `--brick`) |
| `--edition` | couleur du défi (`Challenge.color`, défaut `#2E4A7D`) | `#7FA3E6` | bannière d'édition |
| équipes | `Team.color` (existant) | idem | rangs, avatars, score |

Dérivés : `--ink-rule` (`color-mix(--ink 55 %)`, filets pointillés), `--brick-soft` (`--brick` 14 %), `--kyle-ring` (`--kyle` 45 %, anneau de survol en sombre).

Sémantique d'état, toujours forme + couleur : **validé** = `--olive-soft` + bordure `--olive` + pastille de coche olive ; **en attente ½** = hachures jaunes (`repeating-linear-gradient(135deg, var(--hi) 0 6px, transparent 6px 12px)`) + bordure `--kyle-deep` ; **refus/négatif** = brique ; **libre** = surface + `--line`.

Implémentation : **un seul bloc de tokens**, chaque valeur en `light-dark(clair, sombre)` ; `:root { color-scheme: light dark }` et `:root[data-theme="light"|"dark"] { color-scheme: … }` pour le réglage manuel — pas de palette sombre dupliquée. Exposer les tokens à Tailwind 4 via `@theme inline` (`--color-kyle`, `--color-olive-ink`, `--radius-card`, …). Le réglage utilisateur (Auto / Clair / Sombre) vit dans `localStorage` (`ak-theme`) avec un script inline anti-flash dans `app/layout.tsx` et un sélecteur dans la page Aide et le rail admin.

### Échelles (`app/globals.css`)
| Famille | Tokens |
|---|---|
| Rayon | `--r-xs 6` · `--r-sm 10` · `--r-md 14` · `--r-lg 18` · `--r-pill 999` |
| Espace | `--sp-1 4` → `--sp-2 8` · `--sp-3 12` · `--sp-4 16` · `--sp-5 20` · `--sp-6 24` · `--sp-8 32` · `--sp-10 40` |
| Corps | `--fs-xs 12` · `--fs-sm 13` · `--fs-base 15` · `--fs-md 17` · `--fs-nav 11` |
| Display | `--fs-d1 18` · `--fs-d2 22` · `--fs-d3 28` · `--fs-d4 34` · `--fs-d5 56` |
| Ombres | `--shadow-raised` · `--shadow-card` · `--shadow-float` (survol) · `--shadow-modal` · `--shadow-nav` · `--shadow-rail` |
| Bordure | `--bw 1.5px` = bord d'un objet ; `1px` = trait sur le papier |
| Mouvement | `--dur-fast 120ms` · `--dur 160ms` · `--dur-slow 280ms` · `--ease` · `--ease-pop` |
| Ornements | `--grain` (bruit 180 px, `body::before`) · `--ink-underline` (trait sous les `h1`) · `--check-badge` (coche des cases validées) |

Les échelles de corps portent le préfixe `--fs-*` et non `--text-*` : le second est l'espace de noms de Tailwind, et le redéfinir changerait `text-sm` partout, admin compris.

### Typographie (`next/font/google`)
- **Fraunces** (`opsz,wght` 9..144 / 500, 700, 900) → `--font-display` : titres `h1–h3`, gros chiffres (score, points, KPIs), et l'italique `.accent` (prénom, auteur·ice, unité « pts », amorce d'histoire — jamais un nombre).
- **Nunito Sans** (400, 600, 700, 800 + italic 400) → `--font-body` : tout le reste. `tabular-nums` sur tout chiffre en colonne.
- Échelle : h1 28 px (mobile) / 34 px (bureau) / 30 px (admin), h2 18, corps 15, secondaire 13 (`.meta`), 12 (`.meta-xs`), eyebrow 11 px majuscules espacées (`.eyebrow`).
- Graisses : 400 texte, 600 libellés/pastilles/nav, 700 noms et titres, 800 réservé au livre de comptes et au bouton primaire.
- Supprimer Geist.

### Composants partagés (`components/ui/*`, server components sauf mention)
`Button` (primary / ghost / danger × sm / md / lg, `small` = alias de `sm`), `Card` (`tier` card / flat / raised / sheet + `interactive`), `PageTitle` (h1 + trait d'encre + kicker + action), `SectionHeading` (h2 + filet pointillé), `Meta` (13 px, `row` pour les faits joints par `·`), `Pill` (ok / wait / no / type, `stamp` pour les états tamponnés), `Flash`, `Eyebrow`, `ScoreCard`, `Stat`, `Field`, `Avatar`, `KyleEmpty` (boîte pointillée), `ProgressBar`, `BingoCell`, `RankRow`, `MemberRow`, `Medal`, `Ledger`, `ThemeToggle` (client). Jeu d'icônes maison dans `components/ui/icons.tsx` (24 viewBox, `currentColor`, trait 2) — **aucun emoji** dans les écrans joueur. Pas de librairie de composants.

## 3. Routage et mode démo

```
app/
  page.tsx                    / → landing publique (anonyme) ; redirige vers /home si connecté
  (public)/demo/…             démo joueur : mêmes vues que (player), données lib/demo/data.ts, actions no-op
  (public)/demo/admin/…       démo admin : mêmes vues que admin
  (player)/home … (inchangés) /home (ex-« / »), /books, /bingo, /quests, /story, /leaderboard, /team, /help
  admin/…                     inchangé (nouveau rail + tableau de bord)
```

- `proxy.ts` : `/`, `/demo`, `/demo/*`, `/login` deviennent publics. `requireUser` reste dans chaque page réelle (ne pas l'appeler dans les pages démo).
- **Séparation vue / données** : chaque page réelle devient `page.tsx` (fetch + auth) → `<XxxView {...data} />` ; le composant de vue est **pur** (props sérialisables) et vit dans `app/(player)/xxx/XxxView.tsx` (idem admin). Les pages démo importent les mêmes vues avec `lib/demo/data.ts`. Types de props = types de retour des services (`Awaited<ReturnType<typeof getTeamBoard>>`, etc.) pour que la démo reste alignée.
- **Actions en démo** : les vues reçoivent une prop `demo?: boolean` ; les formulaires appellent alors `demoAction` (`lib/demo/actions.ts`, `"use server"`) qui redirige vers la même page avec `?ok=Mode démo : action simulée.` Un bandeau discret « Démo — données fictives » en haut de chaque écran démo, avec bouton « Se connecter avec Discord ».
- `/home` : le layout joueur (`app/(player)/layout.tsx`) et `BottomNav` passent à **5 onglets** (Accueil, Lectures, Bingo, Quêtes, Histoire) ; Classement, Équipe, Aide, Admin (si admin) accessibles depuis l'accueil (liens texte) — comme la maquette.
- Landing (`app/page.tsx` + `components/landing/*`) : hero (Kyle + « Lisez en équipe. Gagnez ensemble. »), 3 piliers (pages ÷ 10 · ½ + ½ · 3 votes), éditions (les `Challenge` FINISHED/ACTIVE réels si présents, sinon les deux cartes de démo), « comment ça marche », deux CTA « Voir la démo joueur » (`/demo`) / « Voir la démo organisateur » (`/demo/admin`) + « Se connecter » (`/login`). Métadonnées : titre « Aceep&Kyle », description, `themeColor` `#FFD84A`, favicon depuis Kyle (générer `app/icon.png` 512 px à partir de `public/Kyle.png` avec `sharp` ou PIL).

## 4. Écrans — contenu exact (voir la maquette pour la mise en page)

**Joueur (cadre mobile, `max-w-lg`)**
- **Accueil `/home`** : salutation, `ScoreCard` (édition, score Fraunces, rang « 2ᵉ sur 4 · à 11,4 pts de X »), 2 stats (mes lectures romans/graphiques ; mes points + % de l'équipe), CTA « + J'ai fini une lecture », carte « Cette semaine » (vote en cours + délai, case/quête en attente, vérification dimanche 19–21 h), liens Classement / Mon équipe / Aide. Données : `getTeamScore`, `getLeaderboard` (rang + écart), `listBooks`, `getTeamStoryView` (vote), `getTeamBoard` (cases ½).
- **Lectures `/books`** : liste avec vignette (dégradé aux couleurs d'équipe), titre, pill `graphique`, auteur · pages · date, liens `🗺️ quête #n` / `🎯 case B3` (+ `(½)`), points `+51,2` Fraunces, actions Modifier / Supprimer / « modifiable jusqu'à HH:MM » ; section capitaine « Lectures de l'équipe » ; `KyleEmpty` si vide.
- **Formulaire `/books/new`, `/books/[id]/edit`** : champs comme aujourd'hui, **aperçu des points en direct** sous « pages », hint type contextuel (roman / graphique / < 150 p.), attestation d'antériorité sous « case », bandeau `Flash warn` pendant la fenêtre, `finishedAt`.
- **Bingo `/bingo`** : en-tête « Grille n sur N · titre · x/25 · k lignes », grille (cases `BingoCell` : validée olive, ½ hachurée, libre), panneau de case (`sheet`, bordure `--kyle-deep`) avec lectures posées et select « Ajouter la seconde moitié (ou un roman) », légende, historique des grilles terminées, texte des règles. `BingoBoard` reste client (sélection dérivée des props, cf. commit b5e434c).
- **Quêtes `/quests`** : cartes `#n — titre`, barre de progression (0 / ½ jaune / 100 % olive), pill « validée » ou bouton « + Lecture », lectures rattachées, quêtes issues de l'histoire avec bordure couleur de l'équipe cible + pill « imposée par l'histoire », section « Fermées / à venir ».
- **Histoire `/story`** : eyebrow édition · équipe, titre du chapitre, texte en Fraunces 16 px, bloc **égalité** (bordure jaune, cascade, boutons « Trancher : … » selon `vote.tie.canBreak`, confirmation admin), bloc vote (délai, `n votes (3 minimum)`, « tu as voté, tu peux changer d'avis »), choix (`mine` fond `--hi`, `locked` 55 %), effets en olive, votants, parcours.
- **Classement `/leaderboard`** : `RankRow` bordure gauche couleur d'équipe, médailles, ex æquo en pill, décimales, mention « une case en attente ne rapporte rien… ».
- **Équipe `/team`** : titre couleur d'équipe, capitaine ⭐ / adjoint·e 🎖️, 4 stats par source (Histoire en brique si négatif), `Flash warn` modificateur actif, membres (`MemberRow` avec `Avatar`), formulaire adjoint (capitaine/admin), `Ledger` derniers points (+ olive / − brique).
- **Aide `/help`** : Kyle + titre, 4 cartes de règles (contenu `lib/discord/help.ts` inchangé), `ThemeToggle`.

**Admin (desktop, rail gauche 230 px avec Kyle, `aria-current` fond `--hi`)**
- **Tableau de bord `/admin`** (nouveau) : bannière édition (`.ed`, couleur `--edition`, « semaine k / n »), 4 KPIs (lectures + delta 7 j, points distribués, joueurs actifs 7 j, prochain classement), « À traiter » (égalités en cours via `tiedVotes`, chapitres dormants via `dormantTeams`, dernier classement publié via `BotEvent weekly:*`), classement en direct, état du bot (dernier tick = dernier `BotEvent`, crons), table des dernières lectures (dont suppressions en brique).
- **Défi `/admin/challenge`** : formulaire existant + **couleur de l'édition** + tableau des éditions (actif / terminé, « + Nouvelle édition ») + encart planificateur (Hobby : cron quotidien, `/api/cron/tick` externe).
- **Équipes `/admin/teams`** : table (couleur, membres, capitaine, adjoint·e, salons aventure/librairie en `code` avec pill « manquant » si vide, grille n/N, points) ; formulaire d'édition en carte bordure jaune (bordure brique + hint sur salon librairie vide) ; suppression en `danger`.
- **Joueurs `/admin/players`** : table joueurs (avatar, Discord id abrégé, équipe ⭐, rôle, lectures, Déplacer) + carte Inviter + invitations en attente.
- **Bingo `/admin/bingo`** : table des grilles ordonnées avec **mini-grilles d'avancement par équipe** (`TeamGrid` + `completePositions`), ↑ ↓, Modifier ; formulaire d'ajout avec aperçu de taille.
- **Quêtes `/admin/quests`** : table (#, titre, points, fenêtre, cible, « validée par » équipes ✅ / ½) + formulaire.
- **Histoire `/admin/story`** : liste des chapitres en `node` (🚩 départ, choix avec effets en olive, chapitre bloquant = alerte, égalité = alerte + « Trancher en tant qu'admin »), colonne droite « Où en sont les équipes » (chapitre + pill action / vote n/quorum / égalité / dormant) + formulaire chapitre (durée, choix par défaut, conditions).

## 5. Données de démo (`lib/demo/data.ts`)

Exporter des constantes typées comme les retours des services. Contenu (reprendre la maquette) : édition **« Automne des Pages 2026 »** (5 sept → 31 oct 2026, couleur `#2E4A7D`, semaine 3 / 8) ; édition archivée **« Salem »** (2025, vainqueur Les Sorcières du Nord) ; équipes **Les Hérissons** (`#B5533C`, 260 pts, capitaine Nour, adjointe Élise), **Les Renards** (`#2E4A7D`, 248,6, Marc / Sara, l'équipe de la joueuse démo **Léa**), **Les Loutres** (`#3C7A5E`, 201,3, Tom / —), **Les Hiboux** (`#7B4B9C`, 201,3, Inès / Paul) ; lectures de Léa : *Le Problème à trois corps* (512 p., 51,2, quête #3 ✅, case B4 ✅), *Blacksad t. 1* (graphique 56 p., 2,8, case C2 ½), *Les Furtifs* (704 p., 70,4), *La Petite Fille de M. Linh* (149 p. → graphique, 7,5, quête #1 ½) ; grille 2 « Couleurs d'automne » 5×5 (consignes et états dans `design/prototype.html`, tableau `prompts/done/half`), grille 1 « Rentrée littéraire » terminée, grilles 3 « Voix du monde » 4×4 et 4 « Nuit blanche » ; quêtes #1–#4, #6 (issue de l'histoire, cible Renards) ; histoire « La Bibliothèque sans fin », chapitre 4 « La salle des cartes » avec égalité 2–2 (capitaine sollicité depuis 2 h 10), 3 choix dont un verrouillé ; livre de comptes et modificateur ×1,5. Les identifiants sont des chaînes stables (`demo-team-renards`, …).

## 6. Schéma (seul changement de données)

`Challenge.color String @default("#2E4A7D")` — migration non interactive (`prisma migrate diff` + `migrate deploy`, cf. CLAUDE.md), champ dans `challengeSchema` (`lib/services/admin.ts`) et le formulaire admin.

## 7. Ordre de travail (chaque étape doit passer `npm run typecheck && npm run lint && npm test && npm run build`)

1. Tokens + polices + `app/layout.tsx` (thème, script anti-flash, metadata, icône) + composants `components/ui/*` + `Flash` restylé. Commit.
2. Extraction vue/données des pages joueur (`XxxView`), restylage écran par écran d'après la maquette, `BottomNav` 5 onglets, `/` → `/home`. Commit.
3. Admin : rail, tableau de bord, restylage des 6 écrans, champ couleur d'édition (+ migration). Commit.
4. `lib/demo/*`, routes `/demo` et `/demo/admin`, landing `/`, `proxy.ts` public. Commit.
5. Vérification manuelle (§8), déploiement `npx vercel deploy --prod --yes`, redémarrage du serveur de dev.

## 8. Critères d'acceptation

- `/`, `/demo`, `/demo/admin` s'affichent **sans cookie de session** et sans appel Discord ; aucune page démo n'appelle Prisma.
- Toute page réelle appelle toujours `requireUser` / `requireAdmin` / `getCurrentPlayer` ; les Server Actions réelles sont inchangées (mêmes noms, mêmes services).
- Thème : Auto suit `prefers-color-scheme`, Clair / Sombre forcent, sans flash au chargement ; les deux thèmes lisibles (contraste texte ≥ 4,5:1 sur surfaces).
- Aucun `indigo`, `slate`, `pink`, `amber`, `green`, `red` de Tailwind ne subsiste dans `app/` et `components/` (grep).
- Mobile 390 px : pas de scroll horizontal ; les 5 onglets tiennent ; l'action « + J'ai fini une lecture » visible sans scroll sur l'accueil.
- Les règles affichées (points, ½ crédits, fenêtre, cascade) restent celles de `SPEC-challenge-lecture.md` — la refonte ne change aucun texte de règle.
- Tests existants verts ; ajouter un test de rendu léger (`lib/demo/data.test.ts`) vérifiant que les données de démo respectent les invariants (points = `readingPoints(pages)`, types = `effectiveType`, sommes de score = somme du livre de comptes).

## 9. Addendum — supervision admin des lectures, bingos et quêtes (2026-08-28)

Objectif : depuis l'admin, **voir et corriger** tout ce que les joueurs ont déclaré. Trois ajouts, réels + démo, sans toucher aux règles (on passe par `updateBook` / `deleteBook` de `lib/services/books.ts` avec un acteur `role: "ADMIN"`, qui a déjà tous les droits et ignore la fenêtre du dimanche).

### 9.1 Admin › Lectures (`/admin/readings`, rail « 📚 Lectures » entre Joueurs et Bingo)
- Table de **toutes les lectures du défi** (`Book` où `team.challengeId` = défi actif, y compris `deletedAt` non nul, affichées barrées avec pill « supprimée ») : date, équipe (pastille couleur), joueur, titre — auteur, pages, type (pill), points (`fmtPoints`), quête `#n` (½ si graphique), case `B3` (½), modifié par / quand. Tri par date décroissante, **filtres** en haut (équipe, joueur, recherche titre/auteur, « afficher les supprimées »), via query params, 50 lignes par page (`?page=`).
- **« Modifier »** ouvre la `Modal` (`components/ui/Modal.tsx`, pleine page sur mobile) pré-remplie : titre, auteur·ice, pages (aperçu des points), type, quête (choix de `questChoices(challengeId, teamId)` + la quête actuelle), case (`cellChoices(teamId)` + la case actuelle), terminé le ; bouton « Enregistrer » → `updateBook`, « Supprimer la lecture » → `deleteBook`, garde-fou modifications non enregistrées (`isDirty`). Les erreurs de règle (case déjà validée…) reviennent en `Flash` rouge via `withFlash`.
- Service : `lib/services/admin-readings.ts` → `listReadingsAdmin(challengeId, { teamId?, userId?, q?, deleted?, page })` (Prisma, `include` user/team/questBook.quest/bingoFill.cell/updatedBy) et `getReadingAdmin(bookId)`. Actions : `app/admin/readings/actions.ts` (`updateReadingAction`, `deleteReadingAction`) avec l'acteur `{ id: admin.id, role: "ADMIN", teamId: null, isCaptain: false }`.
- Démo : `lib/demo/data.ts` → `DEMO_READINGS_ADMIN` (≈ 12 lectures sur les 4 équipes, dont 1 supprimée) ; page `/demo/admin/readings` avec la même vue et `demoAction`.

### 9.2 Admin › Bingo — grilles par équipe
Sous la table des grilles, une section **« Grilles des équipes »** : sélecteur d'équipe (`?team=`), puis la grille active de l'équipe (réutiliser `getTeamBoard(teamId)` et `BingoCell`) ; au clic sur une case, panneau avec les lectures posées (« Léa — Titre ½ », bouton **Retirer** → `updateBook(admin, bookId, { cellId: null })`) et un formulaire **Placer une lecture** (select des lectures de l'équipe non placées, `listTeamBooks`-like : `prisma.book.findMany({ where: { teamId, deletedAt: null, bingoFill: null } })`) → `updateBook(admin, bookId, { cellId })`. Historique des grilles terminées de l'équipe (`TeamGrid.completedAt`). Le composant client peut être une variante de `app/(player)/bingo/BingoBoard.tsx` acceptant `adminBooks` + actions ; ne pas dupliquer la logique de sélection. Démo : équipe Renards avec `DEMO_GRID`.

### 9.3 Admin › Quêtes — avancement par équipe
Sous la table des quêtes, section **« Avancement par équipe »** : sélecteur d'équipe, puis la liste des quêtes avec progression (`listQuestsForTeam(challengeId, teamId)`), lectures rattachées avec **Retirer** (`updateBook(admin, bookId, { questId: null })`) et formulaire **Rattacher une lecture** (lectures de l'équipe sans quête → `updateBook(admin, bookId, { questId })`). Démo : Renards.

### Vérification
`npm run typecheck && npm run lint && npm test && npm run build` ; `/admin/readings` filtre/édite/supprime une lecture et le livre de comptes se corrige (ledger négatif visible sur `/team`) ; retirer puis replacer une lecture sur une case recalcule les bonus de ligne ; `/demo/admin/readings`, `/demo/admin/bingo?team=…`, `/demo/admin/quests?team=…` → 200 sans session. Un commit par sous-section.
