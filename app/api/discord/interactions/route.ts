import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { after, NextResponse } from "next/server";
import { APP_URL as appUrl } from "@/lib/app-url";
import { cancelBookPending, chooseBookOption, openBookModal, saveBookPending, submitBookModal, type FlowCtx, type InteractionReply } from "@/lib/discord/book-flow";
import { bingoCard, bingoCellCard } from "@/lib/discord/bingo";
import { GRID_IMAGE_FILENAME, renderGridPng } from "@/lib/bingo/grid-image";
import { readingConfirmation, type DiscordEmbed } from "@/lib/discord/cards";
import { BOOK_MODAL_ID, NONE, modalPayload, modalValues, parseBookId } from "@/lib/discord/components";
import { hasManageGuild, parseChallengerInteraction } from "@/lib/discord/challenger";
import { parseInviteInteraction } from "@/lib/discord/invite-command";
import { challengeCreatingCard, challengeFailedCard, challengeReadyCard } from "@/lib/discord/challenger-cards";
import { announceGridChange, announceRankChange, announceReading, announceResolution, syncVoteMessage } from "@/lib/discord/events";
import { editOriginalResponse, getGuild } from "@/lib/discord/rest";
import { CHALLENGE_MODAL_ID, CHALLENGE_MODAL_TITLE, challengeModalInputs, parseChallengeModal } from "@/lib/tenancy/challenge-modal";
import { userMessage } from "@/lib/errors";
import { fmtPoints } from "@/lib/format";
import { HELP_TITLE, helpText } from "@/lib/discord/help";
import { bingoCellChoices, cellChoices, editableBookChoices, questChoices, teamChoices } from "@/lib/services/autocomplete";
import { inviteMembers, notifyAndSync } from "@/lib/services/invites";
import { bootstrapGuildChallenge, createChallengeFromGuild } from "@/lib/services/challenger";
import { getTeamBoard } from "@/lib/services/bingo";
import { bookPatchSchema, bookSchema, deleteBook, describeResult, logBook, updateBook } from "@/lib/services/books";
import { getLeaderboard, withLeaderWatch } from "@/lib/services/leaderboard";
import { challengeForGuild, resolveDiscordActor } from "@/lib/services/membership";
import { listQuestsForTeam } from "@/lib/services/quests";
import { askQuestion } from "@/lib/services/questions";
import { castBallot, getTeamStoryView } from "@/lib/services/story";
import { tickOnActivity } from "@/lib/services/tick";

/**
 * Discord HTTP interactions: slash commands, autocomplete and vote buttons.
 * Discord signs every request with the app's public key; anything unsigned is rejected.
 */

/**
 * `/challenger creer` answers straight away and does the work in `after()`:
 * creating an edition, its teams, a category, four salons and a forum is far
 * more than the three seconds Discord gives an interaction. `after()` runs for
 * as long as the route may — twelve teams take some twenty-five seconds at the
 * bootstrap's pace, so the minute of a Fluid function is the right ceiling.
 */
export const maxDuration = 60;

/** One interaction response. `data` carries more than text (embeds, components) for the richer branches. */
const reply = (type: number, data?: unknown) => NextResponse.json({ type, data });
/**
 * Flag 64 = only the caller sees it. `extra` carries the rest of the response
 * data when a branch needs it — `allowed_mentions` for `/inviter`, whose
 * confirmation names people with `<@id>` without pinging them.
 */
const ephemeral = (content: string, extra?: Record<string, unknown>) =>
  reply(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, { content, flags: 64, ...extra });
const publicReply = (content: string) => reply(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, { content });
/** Long private answers go in an embed: `content` stops at 2 000 characters, an embed description at 4 096. */
const ephemeralEmbed = (title: string, description: string) =>
  reply(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, { embeds: [{ title, description }], flags: 64 });
/** Same, for a card built whole by a pure module (colour, footer, link). */
const ephemeralCard = (embed: DiscordEmbed) => reply(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, { embeds: [embed], flags: 64 });

/**
 * Une carte avec une image à elle : Discord n'accepte un fichier qu'en
 * `multipart/form-data` — `payload_json` porte la réponse habituelle, `files[0]`
 * l'octet du PNG, et l'embed le désigne par `attachment://…`. La frontière est
 * posée par le runtime à partir du `FormData`.
 */
function ephemeralCardWithImage(embed: DiscordEmbed, png: Buffer, filename: string) {
  const payload = {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed], attachments: [{ id: 0, filename }], flags: 64 },
  };
  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));
  form.append("files[0]", new Blob([new Uint8Array(png)], { type: "image/png" }), filename);
  return new NextResponse(form);
}
const choices = (list: { name: string; value: string }[]) => reply(InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT, { choices: list });
/** The « J'ai fini un livre » handlers already return a complete response body. */
const fromFlow = (r: InteractionReply) => NextResponse.json(r);

/** An option, or a sub-command (`type` 1) carrying its own options. */
type Option = { name: string; type?: number; value?: string | number | boolean; focused?: boolean; options?: Option[] };
/** A modal row and its (possibly nested) text inputs, as MODAL_SUBMIT sends them back. */
type ModalRow = { type: number; components?: { type: number; custom_id?: string; value?: string; components?: ModalRow["components"] }[] };
type Interaction = {
  id: string;
  type: number;
  token: string;
  application_id?: string;
  channel_id?: string;
  /** The Discord server the command was typed in: it decides which challenge answers. */
  guild_id?: string;
  data?: {
    name?: string;
    custom_id?: string;
    /** 2 = button, 3 = string select. */
    component_type?: number;
    /** String-select selections. */
    values?: string[];
    options?: Option[];
    /** MODAL_SUBMIT payload. */
    components?: ModalRow[];
    /** The objects behind the ids of the typed options — the only way to spot a bot. */
    resolved?: { users?: Record<string, { id: string; bot?: boolean; username?: string }> };
  };
  /** The message the component was attached to (an ephemeral one is never fetchable). */
  message?: { id: string; flags?: number };
  /** `permissions`: what the caller may do **in this guild**, computed by Discord. */
  member?: { user: { id: string; username: string }; permissions?: string };
  user?: { id: string; username: string };
};

/**
 * On ne rejoint plus un défi soi-même : l'organisation invite, et l'invitation
 * prend effet à la connexion suivante (`consumePendingInvites`). Le même texte
 * répond à l'ancienne sous-commande `/challenger rejoindre`, que Discord
 * continue d'afficher tant que les commandes globales ne sont pas ré-enregistrées.
 */
const joinByInvite = () =>
  `On ne rejoint plus un défi soi-même : demande une invitation aux organisateur·ices, elle s’appliquera à ta prochaine connexion sur ${appUrl()}/login. Pour ouvrir le défi de ce serveur : \`/challenger creer\`.`;

/** « Gérer le serveur » — creating a challenge speaks for the whole server. */
const MANAGE_GUILD_ONLY = "Créer le défi de ce serveur demande la permission « Gérer le serveur ».";

const alreadyRunning = (name: string) =>
  `Ce serveur a déjà un défi : « ${name} ». Pour y participer, demande une invitation aux organisateur·ices ; pour le piloter, ouvre ${appUrl()}/admin/challenge.`;

/**
 * `/challenger creer` — the only command that works on a server with no
 * challenge, and for a Discord id with no account. It answers with the form
 * (`CHALLENGE_MODAL_ID`), pre-filled with the server's name: a modal has to be
 * the *first* answer to the interaction, so nothing but the one `getGuild` call
 * may happen before it. Any other sub-command (a retired one Discord still
 * offers, or a payload we do not know) gets the invitation explanation rather
 * than a raw error.
 */
async function challengerCommand(interaction: Interaction) {
  const guildId = interaction.guild_id;
  if (!guildId) return ephemeral("Cette commande se lance depuis un serveur Discord.");
  const parsed = parseChallengerInteraction(interaction.data?.options);
  if (!parsed) return ephemeral(joinByInvite());

  try {
    if (!hasManageGuild(interaction.member?.permissions)) return ephemeral(MANAGE_GUILD_ONLY);
    const existing = await challengeForGuild(guildId);
    if (existing && existing.status !== "FINISHED") return ephemeral(alreadyRunning(existing.name));

    const guild = await getGuild(guildId);
    return reply(
      InteractionResponseType.MODAL,
      modalPayload({
        customId: CHALLENGE_MODAL_ID,
        title: CHALLENGE_MODAL_TITLE,
        inputs: challengeModalInputs({ guildName: guild.ok ? guild.data.name : null }),
      }),
    );
  } catch (e) {
    return ephemeral(`❌ ${userMessage(e)}`);
  }
}

/**
 * The form comes back: everything the edition needs was typed in it, so the
 * whole challenge — edition, teams, roles, category, salons, forum — is built
 * here, in `after()`, behind a deferred answer.
 *
 * The permission is checked **again**: a `custom_id` is only a string, and a
 * submission can be replayed by someone who never saw the command. The tenant
 * is *not* resolved first — this is precisely the path of a server with no
 * challenge and of a person with no account.
 */
async function challengeModalSubmit(interaction: Interaction, discordId: string) {
  const guildId = interaction.guild_id;
  if (!guildId) return ephemeral("Ce formulaire se remplit depuis un serveur Discord.");
  if (!hasManageGuild(interaction.member?.permissions)) return ephemeral(MANAGE_GUILD_ONLY);

  // Discord closes the modal on send and refuses to reopen it: a refusal is a
  // sentence saying what to fix, and the person retypes the command.
  const parsed = parseChallengeModal(modalValues(interaction.data), new Date());
  if (!parsed.ok) return ephemeral(`${parsed.error}\n\nRetape \`/challenger creer\` : le formulaire se rouvrira.`);

  const { name, startAt, endAt, teams } = parsed.data;
  const appId = interaction.application_id ?? process.env.AUTH_DISCORD_ID ?? "";
  const token = interaction.token;

  after(async () => {
    // One message, rewritten at each step: « je prépare » then the result.
    const show = async (embed: DiscordEmbed) => {
      try {
        await editOriginalResponse(appId, token, { embeds: [embed] });
      } catch (e) {
        console.error("[challenger] carte non mise à jour", e);
      }
    };
    await show(challengeCreatingCard(name));

    let created;
    try {
      created = await createChallengeFromGuild({ guildId, discordId, name, startAt, endAt, teams });
    } catch (e) {
      return show(challengeFailedCard(userMessage(e), appUrl()));
    }
    if (created.kind === "exists") return show(challengeFailedCard(alreadyRunning(created.challenge.name), appUrl()));

    // The edition exists whatever happens next: a Discord hiccup leaves a
    // challenge to finish from the site, never a half-written database.
    const summary = { created: [] as string[], skipped: [] as string[], errors: [] as string[] };
    try {
      const done = await bootstrapGuildChallenge(created.challenge.id, discordId);
      summary.created = done.created;
      summary.skipped = done.skipped;
      summary.errors = done.errors;
    } catch (e) {
      summary.errors.push(userMessage(e));
    }

    await show(challengeReadyCard({ name: created.challenge.name, startAt, endAt, teams, summary, appUrl: appUrl(), pendingLogin: created.pendingLogin }));
  });

  return reply(InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE, { flags: 64 });
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";
  const rawBody = await request.text();
  const publicKey = process.env.DISCORD_PUBLIC_KEY ?? "";
  if (!publicKey || !(await verifyKey(rawBody, signature, timestamp, publicKey))) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let interaction: Interaction;
  try {
    interaction = JSON.parse(rawBody) as Interaction;
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }
  if (interaction.type === InteractionType.PING) return NextResponse.json({ type: InteractionResponseType.PONG });
  const isAutocomplete = interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE;

  const discordUser = interaction.member?.user ?? interaction.user;
  if (!discordUser) return ephemeral("Utilisateur inconnu.");

  // `/challenger` answers *before* the tenant is resolved: it is precisely the
  // command of a server that has no challenge, or of someone who belongs to none.
  // Its form comes back the same way, and must be read before anything tries to
  // find a challenge that does not exist yet.
  if (interaction.type === InteractionType.MODAL_SUBMIT && interaction.data?.custom_id === CHALLENGE_MODAL_ID) {
    return challengeModalSubmit(interaction, discordUser.id);
  }
  if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data?.name === "challenger") {
    return challengerCommand(interaction);
  }

  // The server decides the tenant: same bot, one challenge per Discord guild.
  const resolved = await resolveDiscordActor(discordUser.id, interaction.guild_id ?? null);
  if (resolved.kind !== "ok") {
    if (isAutocomplete) return choices([]);
    if (interaction.data?.name === "help" || interaction.data?.name === "aide") return ephemeralEmbed(HELP_TITLE, helpText(null));
    if (resolved.kind === "no-challenge") return ephemeral("Ce serveur n’a pas encore de défi : un·e admin du serveur peut le créer avec `/challenger creer`.");
    if (resolved.kind === "not-member") return ephemeral("Tu n’es pas inscrit·e à ce défi : demande une invitation aux organisateur·ices, elle s’appliquera à ta prochaine connexion.");
    return ephemeral(`Tu n’es pas encore inscrit·e : demande une invitation aux organisateur·ices du défi, puis connecte-toi sur ${appUrl()}`);
  }
  const { user, challenge, role, team } = resolved.actor;
  if (!isAutocomplete) after(() => tickOnActivity(challenge.id));
  const actor = { id: user.id, role, challengeId: challenge.id, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id };
  const opts = Object.fromEntries((interaction.data?.options ?? []).map((o) => [o.name, o.value]));
  const libraryChannel = team?.discordLibraryChannelId ?? team?.discordChannelId ?? null;
  const inTeamChannel = !!libraryChannel && interaction.channel_id === libraryChannel;
  const teamChannelOnly = () =>
    ephemeral(libraryChannel ? `Utilise cette commande dans la librairie de ton équipe (<#${libraryChannel}>).` : "Ton équipe n'a pas encore de salon librairie configuré.");
  const adventureChannel = team?.discordChannelId ?? null;
  const inAdventure = !!adventureChannel && interaction.channel_id === adventureChannel;
  const adventureOnly = () =>
    ephemeral(adventureChannel ? `L'histoire se joue dans le salon aventure de ton équipe (<#${adventureChannel}>).` : "Ton équipe n'a pas encore de salon aventure configuré.");
  const ctx: FlowCtx = {
    actor,
    user,
    username: discordUser.username,
    challenge,
    team,
    channelId: interaction.channel_id ?? null,
    inTeamChannel,
    libraryChannel,
  };

  try {
    // --- Autocomplete --------------------------------------------------------
    if (isAutocomplete) {
      const focused = interaction.data?.options?.find((o) => o.focused);
      const q = String(focused?.value ?? "");
      // L'équipe de `/inviter` se cherche avant tout garde d'équipe : on invite
      // précisément des gens qui n'en ont pas, et l'organisateur·ice qui invite
      // n'est pas toujours dans une équipe.
      if (focused?.name === "equipe") return choices(await teamChoices(challenge.id, q));
      if (!team) return choices([]);
      if (focused?.name === "quete") return choices(await questChoices(challenge.id, team.id, q));
      // La même option `case` sert deux gestes : poser une lecture (les cases
      // qu'on peut encore remplir) et détailler une case de `/bingo` (toutes).
      if (focused?.name === "case") return choices(interaction.data?.name === "bingo" ? await bingoCellChoices(team.id, q) : await cellChoices(team.id, q));
      if (focused?.name === "livre") return choices(await editableBookChoices(actor, q));
      return choices([]);
    }

    // --- Buttons and dropdowns ----------------------------------------------
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const customId = interaction.data?.custom_id ?? "";
      // « J'ai fini un livre » owns the `book:*` namespace; the votes keep `vote:*`.
      const book = parseBookId(customId);
      if (book) {
        // Sans équipe il n'y a pas de salon librairie : le dire ainsi plutôt que
        // de renvoyer vers un salon qui n'existe pas.
        if (!team) return ephemeral("Rejoins une équipe d’abord.");
        if (!inTeamChannel) return teamChannelOnly();
        if (book.action === "new") return fromFlow(await openBookModal(ctx));
        if (!book.pendingId) return ephemeral("Bouton inconnu.");
        if (book.action === "save") return fromFlow(await saveBookPending(ctx, book.pendingId));
        if (book.action === "cancel") return fromFlow(await cancelBookPending(ctx, book.pendingId));
        // type / quest / cell — a string select, whose selection only exists in `data.values`.
        const value = interaction.data?.values?.[0] ?? NONE;
        return fromFlow(await chooseBookOption(ctx, book.action, book.pendingId, value));
      }
      const [kind, voteId, choiceId] = customId.split(":");
      if (kind !== "vote" || !voteId || !choiceId) return ephemeral("Bouton inconnu.");
      if (!inAdventure) return adventureOnly();
      const result = await castBallot(voteId, user.id, choiceId);
      after(async () => {
        await syncVoteMessage(voteId);
        if (result) await announceResolution(result);
      });
      return ephemeral(result ? "Vote enregistré — le vote est clos !" : "Vote enregistré ✅");
    }

    // --- Modal « Une lecture de plus » --------------------------------------
    if (interaction.type === InteractionType.MODAL_SUBMIT) {
      if ((interaction.data?.custom_id ?? "") !== BOOK_MODAL_ID) return ephemeral("Formulaire inconnu.");
      if (!inTeamChannel) return teamChannelOnly();
      return fromFlow(await submitBookModal(ctx, modalValues(interaction.data)));
    }

    // --- Slash commands -----------------------------------------------------
    if (interaction.type !== InteractionType.APPLICATION_COMMAND) return ephemeral("Interaction non gérée.");

    switch (interaction.data?.name) {
      case "ajouter-un-livre": {
        if (!inTeamChannel) return teamChannelOnly();
        const parsed = bookSchema.safeParse({
          title: opts.titre,
          author: opts.auteur,
          pages: opts.pages,
          type: opts.type ?? "ROMAN",
          questId: opts.quete ?? "",
          cellId: opts.case ?? "",
        });
        if (!parsed.success) return ephemeral(`Paramètres invalides : ${parsed.error.issues[0]?.message}`);
        const { result, before, after: top } = await withLeaderWatch(challenge.id, () => logBook(actor, parsed.data));
        if (team) after(() => announceRankChange(challenge.id, before, top));
        if (team && result.cell?.grid) after(() => announceGridChange(team.id, result.cell!.grid!));
        // The public trace is the reading card, posted once per book whatever the surface.
        const detail = describeResult(result, false);
        if (team) after(() => announceReading(result.book.id, { kind: "new", points: result.points, detail }));
        return ephemeral(readingConfirmation({ title: result.book.title, points: result.points, detail, kind: "new" }));
      }
      case "modifier-un-livre": {
        if (!inTeamChannel) return teamChannelOnly();
        const bookId = String(opts.livre ?? "");
        if (!bookId) return ephemeral("Choisis un livre dans la liste.");
        if (opts.supprimer === true) {
          const { before, after: top } = await withLeaderWatch(challenge.id, () => deleteBook(actor, bookId));
          if (team) after(() => announceRankChange(challenge.id, before, top));
          return publicReply(`🗑️ **${discordUser.username}** a supprimé une lecture.`);
        }
        const patch = bookPatchSchema.safeParse({
          ...(opts.titre !== undefined && { title: opts.titre }),
          ...(opts.auteur !== undefined && { author: opts.auteur }),
          ...(opts.pages !== undefined && { pages: opts.pages }),
          ...(opts.type !== undefined && { type: opts.type }),
          ...(opts.quete !== undefined && { questId: opts.quete }),
          ...(opts.case !== undefined && { cellId: opts.case }),
        });
        if (!patch.success) return ephemeral(`Paramètres invalides : ${patch.error.issues[0]?.message}`);
        if (Object.keys(patch.data).length === 0) return ephemeral("Indique au moins un champ à modifier.");
        const { result, before, after: top } = await withLeaderWatch(challenge.id, () => updateBook(actor, bookId, patch.data));
        if (team) after(() => announceRankChange(challenge.id, before, top));
        if (team && result.cell?.grid) after(() => announceGridChange(team.id, result.cell!.grid!));
        const detail = describeResult(result, false);
        if (team) after(() => announceReading(result.book.id, { kind: "update", points: result.points, detail }));
        return ephemeral(readingConfirmation({ title: result.book.title, points: result.points, detail, kind: "update" }));
      }
      case "score": {
        const rows = await getLeaderboard(challenge.id);
        const medals = ["🥇", "🥈", "🥉"];
        return publicReply(`🏆 **Classement — ${challenge.name}**\n${rows.map((r) => `${medals[r.rank - 1] ?? `${r.rank}.`} **${r.name}**${rows.filter((o) => o.rank === r.rank).length > 1 ? " (ex æquo)" : ""} — ${fmtPoints(r.points)} pts (${r.books} romans, ${r.graphics} graphiques)`).join("\n")}`);
      }
      case "quete": {
        if (!team) return ephemeral("Rejoins une équipe d'abord.");
        const quests = (await listQuestsForTeam(challenge.id, team.id)).filter((q) => q.open);
        if (!quests.length) return ephemeral("Aucune quête ouverte.");
        return ephemeral(
          `🗺️ **Quêtes ouvertes — ${team.name}**\n${quests
            .map((q) => `${q.done ? "✅" : q.progress > 0 ? "◐" : "▫️"} **#${q.number} — ${q.title}** — ${q.points} pts${q.linkedBooks.length ? ` (${q.linkedBooks.map((b) => `${b.owner} — ${b.title}${b.type === "GRAPHIQUE" ? " ½" : ""}`).join(" / ")})` : ""}`)
            .join("\n")}\n\nUne quête se valide avec un roman, ou deux graphiques : option *quete* de \`/ajouter-un-livre\`.`,
        );
      }
      // Éphémère comme /quete : une grille est l'affaire d'une équipe, et les
      // équipes se croisent dans le salon général. `team` vient de
      // `resolveDiscordActor`, déjà borné au défi du serveur : jamais la
      // grille d'une autre équipe, ni d'une autre édition.
      case "bingo": {
        if (!team) return ephemeral("Rejoins une équipe d’abord : le bingo se joue en équipe.");
        const board = await getTeamBoard(team.id);
        const input = {
          teamName: team.name,
          teamColor: team.color,
          grid: board.grid,
          total: board.total,
          bonus: { line: challenge.bingoLineBonus, full: challenge.bingoFullBonus },
        };
        // `/bingo case:D1` — le détail d'une case, sans image.
        const coord = String(opts.case ?? "").trim();
        if (coord) return ephemeralCard(bingoCellCard(input, coord));

        const card = bingoCard(input);
        if (!card.grid) return ephemeralCard(card.embed);
        try {
          return ephemeralCardWithImage(card.embed, renderGridPng(card.grid), GRID_IMAGE_FILENAME);
        } catch (e) {
          // Le dessin est un confort : si le canvas natif manque, la carte part
          // sans son image plutôt que la commande de rendre une erreur.
          console.error("[bingo] image non dessinée", e);
          return ephemeralCard({ ...card.embed, image: undefined });
        }
      }
      case "histoire": {
        if (!team) return ephemeral("Rejoins une équipe d'abord.");
        if (!inAdventure) return adventureOnly();
        const view = await getTeamStoryView(team.id, user.id);
        if (!view) return ephemeral("L'histoire n'a pas encore commencé.");
        if (view.vote?.status === "OPEN") after(() => syncVoteMessage(view.vote!.id));
        return ephemeral(
          `📖 **${view.node.title}**\n${view.node.body.slice(0, 800)}${view.node.body.length > 800 ? "…" : ""}\n\n${
            view.vote?.status === "OPEN" ? `🗳️ Vote en cours (${view.vote.ballots} vote${view.vote.ballots > 1 ? "s" : ""}) → ${appUrl()}/story` : view.unmet.length ? `🔒 À faire : ${view.unmet.join(" ; ")}` : view.node.isEnding ? "✨ Fin de l'histoire." : ""
          }`,
        );
      }
      case "question": {
        const result = await askQuestion({ userId: user.id, challengeId: challenge.id, title: String(opts.titre ?? ""), detail: opts.detail === undefined ? "" : String(opts.detail) });
        return ephemeral(
          result.threadUrl
            ? `❓ Question publiée : ${result.threadUrl}`
            : result.forumConfigured
              ? `❓ Question enregistrée, mais le sujet Discord n'a pas pu être créé. Elle est visible sur ${appUrl()}/faq`
              : `❓ Question enregistrée — le forum n'est pas encore relié, elle est visible sur ${appUrl()}/faq`,
        );
      }
      /**
       * Inviter depuis Discord, sans identifiant : le sélecteur de membre de
       * Discord donne les comptes, `data.resolved` dit lesquels sont des bots.
       * Le droit est celui du **défi** — organisateur·ice de cette édition —,
       * jamais « Gérer le serveur » : un·e co-organisateur·ice ne l'a pas.
       */
      case "inviter": {
        if (role !== "ORGANIZER") return ephemeral("Inviter est réservé aux organisateur·ices du défi.");
        const parsed = parseInviteInteraction(interaction.data?.options, interaction.data?.resolved);
        if (!parsed.ok) return ephemeral(parsed.error);

        const result = await inviteMembers(challenge.id, parsed.data);
        if (!result.invited.length) return ephemeral("Aucune invitation n'a pu être enregistrée : réessaie dans un instant.");
        // Les MP et les rôles Discord après la réponse : Discord attend trois
        // secondes, et un MP refusé ne doit pas faire échouer l'invitation.
        after(() => notifyAndSync(result));

        const who = result.invited.map((id) => `<@${id}>`).join(", ");
        const where = result.team ? ` (équipe ${result.team.name})` : "";
        const as = parsed.data.role === "ORGANIZER" ? " comme organisateur·ice" : "";
        return ephemeral(
          `Invitation envoyée à ${who}${where}${as}. Elle s’applique à leur prochaine connexion sur ${appUrl()}/login — je viens de leur écrire.`,
          { allowed_mentions: { parse: [] } },
        );
      }
      case "aide":
      case "help":
        return ephemeralEmbed(HELP_TITLE, helpText(team));
      default:
        return ephemeral("Commande inconnue. Tape `/help` pour la liste.");
    }
  } catch (e) {
    return ephemeral(`❌ ${userMessage(e)}`);
  }
}
