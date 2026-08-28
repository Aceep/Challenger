/**
 * Registers the slash commands on one guild (instant). Re-run after changing commands.
 * Usage: npm run discord:register -- <guildId>   (or DISCORD_GUILD_ID in env)
 */
const appId = process.env.AUTH_DISCORD_ID;
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.argv[2] ?? process.env.DISCORD_GUILD_ID;
if (!appId || !token || !guildId) throw new Error("AUTH_DISCORD_ID, DISCORD_BOT_TOKEN and a guild id are required");

const STRING = 3;
const INTEGER = 4;
const BOOLEAN = 5;
const TYPE_CHOICES = [
  { name: "roman", value: "ROMAN" },
  { name: "graphique", value: "GRAPHIQUE" },
];
const commands = [
  {
    name: "ajouter-un-livre",
    description: "Enregistrer une lecture terminée (dans la librairie de ton équipe)",
    options: [
      { type: STRING, name: "titre", description: "Titre", required: true },
      { type: STRING, name: "auteur", description: "Auteur·ice", required: true },
      { type: INTEGER, name: "pages", description: "Nombre de pages (édition la plus avantageuse ; < 150 = graphique)", required: true, min_value: 1, max_value: 5000 },
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
  { name: "score", description: "Afficher le classement des équipes" },
  { name: "quete", description: "Lister les quêtes ouvertes et leur avancement" },
  { name: "histoire", description: "Voir le chapitre en cours de ton équipe" },
];

const res = await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands),
});
console.log(res.status, res.ok ? `${commands.length} commandes enregistrées sur le serveur ${guildId}` : await res.text());
