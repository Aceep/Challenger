import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { after, NextResponse } from "next/server";
import { cancelBookPending, chooseBookOption, openBookModal, saveBookPending, submitBookModal, type FlowCtx, type InteractionReply } from "@/lib/discord/book-flow";
import { readingConfirmation } from "@/lib/discord/cards";
import { BOOK_MODAL_ID, NONE, modalValues, parseBookId } from "@/lib/discord/components";
import { announceGridChange, announceRankChange, announceReading, announceResolution, syncVoteMessage } from "@/lib/discord/events";
import { userMessage } from "@/lib/errors";
import { fmtPoints } from "@/lib/format";
import { helpText } from "@/lib/discord/help";
import { cellChoices, editableBookChoices, questChoices } from "@/lib/services/autocomplete";
import { bookPatchSchema, bookSchema, deleteBook, describeResult, logBook, updateBook } from "@/lib/services/books";
import { getLeaderboard, withLeaderWatch } from "@/lib/services/leaderboard";
import { resolveDiscordActor } from "@/lib/services/membership";
import { listQuestsForTeam } from "@/lib/services/quests";
import { askQuestion } from "@/lib/services/questions";
import { castBallot, getTeamStoryView } from "@/lib/services/story";
import { tickOnActivity } from "@/lib/services/tick";

/**
 * Discord HTTP interactions: slash commands, autocomplete and vote buttons.
 * Discord signs every request with the app's public key; anything unsigned is rejected.
 */

/** One interaction response. `data` carries more than text (embeds, components) for the richer branches. */
const reply = (type: number, data?: unknown) => NextResponse.json({ type, data });
/** Flag 64 = only the caller sees it. */
const ephemeral = (content: string) => reply(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, { content, flags: 64 });
const publicReply = (content: string) => reply(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, { content });
const choices = (list: { name: string; value: string }[]) => reply(InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT, { choices: list });
/** The « J'ai fini un livre » handlers already return a complete response body. */
const fromFlow = (r: InteractionReply) => NextResponse.json(r);

type Option = { name: string; value: string | number | boolean; focused?: boolean };
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
  };
  /** The message the component was attached to (an ephemeral one is never fetchable). */
  message?: { id: string; flags?: number };
  member?: { user: { id: string; username: string } };
  user?: { id: string; username: string };
};

const appUrl = () => process.env.AUTH_URL ?? "https://challenger-aceepkyle.vercel.app";

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
  // The server decides the tenant: same bot, one challenge per Discord guild.
  const resolved = await resolveDiscordActor(discordUser.id, interaction.guild_id ?? null);
  if (resolved.kind !== "ok") {
    if (isAutocomplete) return choices([]);
    if (interaction.data?.name === "help") return ephemeral(helpText(null));
    if (resolved.kind === "no-challenge") return ephemeral("Ce serveur Discord n'est relié à aucun défi.");
    if (resolved.kind === "not-member") return ephemeral("Tu n'es pas inscrit·e à ce défi : demande une invitation aux organisateur·ices.");
    return ephemeral(`Tu n'es pas encore inscrit·e : connecte-toi d'abord sur ${appUrl()}`);
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
      if (!team) return choices([]);
      if (focused?.name === "quete") return choices(await questChoices(challenge.id, team.id, q));
      if (focused?.name === "case") return choices(await cellChoices(team.id, q));
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
      case "help":
        return ephemeral(helpText(team));
      default:
        return ephemeral("Commande inconnue. Tape `/help` pour la liste.");
    }
  } catch (e) {
    return ephemeral(`❌ ${userMessage(e)}`);
  }
}
