# Challenge lecture — Spécifications

Bot Discord + application web. Challenge de deux mois (septembre–octobre), joueurs répartis en équipes, sur le thème des procès de Salem.

Ce document est la source de vérité du règlement. Les points non tranchés sont regroupés en fin de document — ne pas les deviner, demander.

---

## 1. Concepts

| Terme | Définition |
|---|---|
| **Lecture** | Une entrée déclarée par un joueur : un livre, lu par un joueur, à un moment donné |
| **Roman** | Livre texte de 150 pages ou plus |
| **Graphique** | Manga, BD, roman graphique, **ou** roman de moins de 150 pages, **ou** poésie |
| **Quête** | Objectif nommé/numéroté, validé par une lecture |
| **Case de bingo** | Case d'une grille d'équipe, validée par une lecture |
| **Demi-crédit** | Contribution partielle d'un graphique à une quête ou une case |
| **Grille** | Ensemble de cases de bingo, propre à une équipe, séquentielle |

La catégorie `graphique` est déterminée par le type déclaré **ou** par le nombre de pages (< 150). Un roman de 140 pages est un graphique à tous égards.

---

## 2. Modèle de données

### Lecture

| Champ | Type | Note |
|---|---|---|
| `id` | uuid | |
| `discord_user_id` | string | **Jamais le pseudo** — le pseudo peut changer, on l'affiche à la volée |
| `equipe_id` | fk | Figé à la création : un changement d'équipe ne doit pas déplacer les points rétroactivement |
| `titre` | string | |
| `auteur` | string | |
| `pages` | int | Édition retenue par le joueur |
| `type` | enum | `roman` \| `graphique` \| `poesie` |
| `points` | decimal(4,1) | Calculé, stocké (ne pas recalculer à la volée : les règles peuvent évoluer) |
| `quete_id` | fk nullable | |
| `case_id` | fk nullable | |
| `grille_id` | fk nullable | Grille active de l'équipe au moment de l'ajout |
| `cree_le` | timestamp | Sert à la fenêtre de modification d'une heure |
| `modifie_le` | timestamp | |
| `modifie_par` | discord_user_id | Trace joueur / capitaine / admin |
| `supprime_le` | timestamp nullable | **Soft delete** — nécessaire pour le rollback des cases |

### Équipe

`id`, `nom`, `capitaine_id`, `adjoint_id`, `points_total`, `jokers_utilises`, `grille_active_id`

### Autres tables

`grille`, `case_bingo`, `quete`, `joker_achat`, `etape_histoire`, `vote`.

---

## 3. Calcul des points

```
pages >= 150  ->  points = pages / 10
pages <  150  ->  points = (pages / 2) / 10
poésie        ->  points = (pages / 2) / 10   [quelle que soit la longueur — À CONFIRMER]
```

- Le seuil est **150 pages inclus** dans la catégorie pleine. Exactement 150 pages → `150 / 10 = 15,0 pts`.
- Arrondi à une décimale. Cas limite : `149 → 74,5 → 7,45`. **Provisoire : arrondi commercial à 0,1 → 7,5.** À confirmer.
- **Nombre de pages** : le joueur choisit l'édition la plus avantageuse, hors éditions à gros caractères. Un livre audio est déclaré avec la pagination du format papier.
- Toute lecture rapporte ses points, même si elle ne valide ni quête ni case.
- Une relecture rapporte ses points normalement.

---

## 4. Commande `/ajouter-un-livre`

Champs saisis : `titre`, `auteur`, `pages`, `type`, `valide_une_quete` (bool → laquelle), `valide_une_case` (bool → laquelle).

Le pseudo et l'équipe sont déduits de l'authentification, jamais saisis.

### Règle d'antériorité

Pour qu'une lecture valide une quête ou une case :

- la lecture doit avoir **commencé après la parution de la grille** ; **ou**
- il s'agit d'un **roman (≥ 150 pages)** dont le joueur avait lu **moins de 50 %** à la parution de la grille.

Un **graphique** commencé avant la parution n'est jamais valide.

Cette règle est **purement déclarative** : ni la date de début ni le pourcentage ne sont collectés. En cochant « valide une quête / une case », le joueur atteste implicitement de sa conformité. Le pourcentage se mesure en pages (`pages / 2`), sur la confiance. Arbitrage en cas de litige : capitaine, puis admin.

**Faille connue et assumée :** relire un graphique lu avant la parution le rend éligible. Le règlement ne la ferme pas.

---

## 5. Édition, suppression, fenêtre de vérification

- Le joueur peut modifier ou supprimer sa lecture pendant **1 heure** après l'enregistrement.
- Passé ce délai, seul le **capitaine** peut agir — sur ses propres lectures et sur celles des membres de son équipe, édition comme suppression.
- Les administrateurs peuvent agir à tout moment, sur toutes les équipes.

### Fenêtre de vérification hebdomadaire

- **Tous les dimanches, 19 h → 21 h (heure de France, `Europe/Paris`, DST géré).**
- Pendant cette fenêtre : ajout, modification, suppression et **achat de joker** désactivés pour joueurs et capitaines. Seuls les admins peuvent agir.
- Les capitaines vérifient les lectures de leur équipe. Les admins vérifient l'ensemble du serveur et assistent les capitaines en difficulté.
- Le bot **annonce l'ouverture et la fermeture** de la fenêtre. Une commande appelée pendant la fenêtre renvoie un message explicite, jamais un échec muet.
- Si une lecture est ajoutée peu avant 19 h, sa fenêtre de modification d'une heure est **suspendue** pendant la fermeture et reprend à la réouverture.

---

## 6. Quêtes et cases de bingo

### Règle générale

Une lecture peut valider **au maximum une quête et une case de bingo** — les deux à la fois avec le même livre, mais jamais deux quêtes ni deux cases.

### Romans (≥ 150 pages)

Un roman valide seul une quête et/ou une case.

### Graphiques — demi-crédits

Chaque graphique porte :
- **½ quête**
- **½ case de bingo**

Ces deux demi-crédits sont **indépendants** : un graphique peut contribuer à une paire pour une quête et à une autre paire pour une case.

Deux demi-crédits se cumulent pour valider. Avec trois graphiques A, B, C : **une seule** quête et **une seule** case sont validées ; le troisième demi-crédit reste en attente d'un quatrième livre. Il ne se forme pas trois paires.

Peu importe la nature des graphiques : un manga + un roman de 140 pages forment une paire valide.

### Validation partagée

Une case peut être validée par **un seul joueur** (deux graphiques) ou par **deux joueurs d'une même équipe** (un graphique chacun). Les deux moitiés doivent venir de la même équipe.

Le bingo est collectif à l'équipe.

### Affichage d'une case

- Validée par un seul joueur : `pseudo — titre`
- Validée par deux joueurs : `pseudo 1 — titre 1` / `pseudo 2 — titre 2`
- État intermédiaire visible : **en attente** (une moitié posée, l'autre manquante)

### Rollback

Si une lecture ayant contribué à une case validée est supprimée, la case **retombe en attente** et le demi-crédit du second joueur reste actif. Aucune case fantôme ne doit subsister. Même logique pour les quêtes.

### Effet sur le classement

Une case en attente ne rapporte rien. Une lecture faite le samedi peut donc ne compter qu'au classement de la semaine suivante. Comportement attendu, à documenter côté joueurs.

---

## 7. Grilles

- **Une grille par équipe.**
- Progression **séquentielle et bloquante** : la grille suivante ne s'ouvre que lorsque **toutes** les cases de la grille en cours sont validées.
- Les grilles ne coexistent pas — une grille remplace la précédente.
- Au changement de grille, **tous les demi-crédits orphelins sont perdus**.
- Les grilles ne sont pas liées à l'histoire à choix : les deux systèmes avancent indépendamment.

---

## 8. Jokers

Soupape contre le blocage sur une case impossible.

### Achat

- Payés en **points**, **déduits du total de l'équipe** (compteur unique : le score affiché au classement est aussi la bourse).
- Points **collectifs**. Seul le **capitaine** achète.
- **Confirmation explicite obligatoire** avant validation — l'achat est irréversible.
- **Pas de crédit** : solde insuffisant → blocage sec, message clair.
- **Pas d'achat** le dimanche entre 19 h et 21 h.
- **Prix croissant à chaque achat** de l'équipe.
- **Nombre limité par équipe sur l'ensemble du challenge.**
- **Aucun remboursement** — c'est un pari assumé.

### Types

| Type | Effet | Prix |
|---|---|---|
| Thème imposé | La case est remplacée par un autre thème imposé | Moins cher |
| Thème libre | La case devient libre | Plus cher |

### Effet sur les demi-crédits

Si la case jokerisée portait un demi-crédit, celui-ci est **perdu**. L'équipe paie des points et perd le demi-livre déjà lu. Dissuasion volontaire des jokers de confort.

### Conséquence à surveiller

Une équipe qui achète beaucoup de jokers progresse davantage mais recule au classement. Arbitrage volume lu / progression — à réévaluer après deux semaines via le prix.

---

## 9. Canal général et classement

- Seuls le **bot** et les **administrateurs** peuvent y écrire.
- Message automatique **tous les dimanches à 20 h** (`Europe/Paris`) avec le classement.
- Classement **par équipe**. En cas d'égalité, l'égalité est annoncée telle quelle, sans départage.
- Le classement part à 20 h même si personne n'a vérifié. La fenêtre jusqu'à 21 h est une sécurité, pas une condition.
- Prévoir un **rattrapage** si le bot est hors service à 20 h : publication au redémarrage avec mention du retard.

---

## 10. Histoire à choix multiples

### Canaux

- Chaque équipe dispose d'un canal `aventure` dédié.
- **Toutes** les commandes liées à l'histoire ne sont disponibles que dans ce canal.
- Lorsqu'un choix est validé (application ou Discord), le texte suivant est publié dans le canal `aventure` de l'équipe.

### Votes

- **Quorum : 3 votants minimum.**
- Un joueur ne vote **qu'une fois**, quel que soit le canal (site ou Discord). Déduplication **côté back** sur `discord_user_id`.
- Le vote est **modifiable jusqu'à la clôture** — choix délibéré pour encourager les débats.

### Temps

- **Étape à vote** : durée maximale par étape. À expiration, le **choix par défaut** de l'étape s'applique.
- **Étape à action** : pas de limite de temps, hors fin du challenge.
- Prévoir une **relance automatique** du bot sur les étapes dormantes.

### Égalité — cascade d'arbitrage

1. Le **capitaine** tranche. Attente : **5 h**.
2. À défaut, l'**adjoint** tranche. Attente : **5 h**.
3. À défaut, le **premier joueur de l'équipe qui se manifeste** tranche, avec l'accord d'un **administrateur**.

### Effets croisés

- Un effet secondaire touchant une autre équipe est **signalé dans le canal de l'équipe concernée**.
- Les effets tiennent compte de l'avancement de chaque équipe (les équipes ne progressent pas au même rythme).
- **Mécanique précise non définie** — voir §12.

---

## 11. Règles d'arbitrage génériques

À appliquer par défaut à toute situation non couverte :

1. En cas de situation non prévue par le règlement, l'**administrateur tranche**.
2. Tout vote non conclu dans le délai imparti bascule sur le **choix par défaut**.

---

## 12. Points non tranchés

**Ne pas implémenter sans décision.**

### Bloquants pour le code

1. **Arrondi** — `149 pages → 7,45 pts`. Arrondi commercial à 0,1 ? Troncature ? Autoriser 0,05 ?
2. **Poésie** — divisée par 2 quelle que soit la longueur (un recueil de 400 p. → 20 pts) ? Et compte-t-elle comme graphique pour la règle des demi-crédits, ou seulement pour les points ?
3. **Réservation de case** — quand un joueur pose un demi-crédit sur une case, la case est-elle réservée à ce mode de validation ? Un troisième joueur peut-il la valider entièrement avec un roman ? Passe-t-il devant ou est-il bloqué ?
4. **Jokers** — nombre maximum par équipe, prix de base, courbe de progression du prix.

### Non bloquants

5. **Quorum de 3** — une équipe de moins de 3 joueurs actifs reste bloquée en permanence. Prévoir un quorum dégressif ?
6. **Pause nocturne** — les délais de 5 h peuvent expirer à 3 h du matin. Suspendre les compteurs entre minuit et 8 h ?
7. **Adjoint** — nommé par le capitaine à l'inscription, ou désigné automatiquement ?
8. **« Premier joueur qui tranche »** — premier à se manifester, ou premier dans l'ordre d'inscription ?
9. **Intégrales et omnibus** — « édition la plus avantageuse » autorise l'intégrale de 1200 p. plutôt que le tome de 200 p. Voulu ?
10. **Abandons et lectures partielles** — aucune règle actuellement.
11. **Effets croisés de l'histoire** — mécanique entière à concevoir.
12. **Contenu** — quêtes, cases, étapes de l'histoire.

---

## 13. Ordre d'implémentation

Choisi pour minimiser les reprises. Chaque étape est utilisable seule.

1. **Schéma de données + `/ajouter-un-livre` + calcul des points**
   Socle. Tout s'y branche. Figer les champs avant d'écrire quoi que ce soit d'autre.
2. **Grille par équipe, quêtes, cases, demi-crédits, rollback**
   La partie la plus subtile — c'est ici que se concentrent les cas limites.
3. **Classement dominical + fenêtre de vérification**
   Cron `Europe/Paris`, désactivation des commandes, messages d'ouverture/fermeture.
4. **Jokers**
   Ne bloque rien d'autre. Peut attendre.
5. **Histoire à choix**
   La moins figée. En dernier.
