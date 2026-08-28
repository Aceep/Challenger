import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { announceGridChange, announceRankChange, announceResolution, syncVoteMessage } from "@/lib/discord/events";
import { fmtPoints } from "@/lib/format";
import { cellChoices, editableBookChoices, questChoices } from "@/lib/services/autocomplete";
import { bookPatchSchema, bookSchema, deleteBook, describeResult, logBook, updateBook, type BookResult } from "@/lib/services/books";
import { getLeaderboard, withLeaderWatch } from "@/lib/services/leaderboard";
import { listQuestsForTeam } from "@/lib/services/quests";
import { castBallot, getTeamStoryView } from "@/lib/services/story";

/**
 * Discord HTTP interactions: slash commands, autocomplete and vote buttons.
 * Discord signs every request with the app's public key; anything unsigned is rejected.
 */

const ephemeral = (content: string) =>
  NextResponse.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content, flags: 64 } });
const publicReply = (content: string) => NextResponse.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content } });
const choices = (list: { name: string; value: string }[]) =>
  NextResponse.json({ type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT, data: { choices: list } });

type Option = { name: string; value: string | number | boolean; focused?: boolean };
type Interaction = {
  type: number;
  channel_id?: string;
  data?: { name?: string; custom_id?: string; options?: Option[] };
  member?: { user: { id: string; username: string } };
  user?: { id: string; username: string };
};

const appUrl = () => process.env.AUTH_URL ?? "https://challenge-six-rose.vercel.app";

async function playerFromDiscord(discordId: string) {
  const user = await prisma.user.findUnique({ where: { discordId }, include: { membership: { include: { team: { include: { challenge: true } } } } } });
  if (!user) return null;
  return { user, team: user.membership?.team ?? null };
}

function describe(username: string, r: BookResult, verb: string) {
  const head = `📚 **${username}** ${verb} *${r.book.title}* (${r.book.pages} p., ${r.book.type === "GRAPHIQUE" ? "graphique" : "roman"})${r.points ? ` → ${r.points > 0 ? "+" : ""}${fmtPoints(r.points)} pts` : ""}`;
  const rest = describeResult(r, false);
  return rest ? `${head}\n${rest}` : head;
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";
  const rawBody = await request.text();
  const publicKey = process.env.DISCORD_PUBLIC_KEY ?? "";
  if (!publicKey || !(await verifyKey(rawBody, signature, timestamp, publicKey))) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as Interaction;
  if (interaction.type === InteractionType.PING) return NextResponse.json({ type: InteractionResponseType.PONG });

  const discordUser = interaction.member?.user ?? interaction.user;
  if (!discordUser) return ephemeral("Utilisateur inconnu.");
  const player = await playerFromDiscord(discordUser.id);
  if (!player) {
    if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) return choices([]);
    return ephemeral(`Tu n'es pas encore inscrit·e : connecte-toi d'abord sur ${appUrl()}`);
  }
  const { user, team } = player;
  const actor = { id: user.id, role: user.role, teamId: team?.id ?? null, isCaptain: team?.captainId === user.id };
  const opts = Object.fromEntries((interaction.data?.options ?? []).map((o) => [o.name, o.value]));
  const libraryChannel = team?.discordLibraryChannelId ?? team?.discordChannelId ?? null;
  const inTeamChannel = !!libraryChannel && interaction.channel_id === libraryChannel;
  const teamChannelOnly = () =>
    ephemeral(libraryChannel ? `Utilise cette commande dans la librairie de ton équipe (<#${libraryChannel}>).` : "Ton équipe n'a pas encore de salon librairie configuré.");

  try {
    // --- Autocomplete --------------------------------------------------------
    if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
      const focused = interaction.data?.options?.find((o) => o.focused);
      const q = String(focused?.value ?? "");
      if (!team) return choices([]);
      if (focused?.name === "quete") return choices(await questChoices(team.challengeId, team.id, q));
      if (focused?.name === "case") return choices(await cellChoices(team.id, q));
      if (focused?.name === "livre") return choices(await editableBookChoices(actor, q));
      return choices([]);
    }

    // --- Vote buttons -------------------------------------------------------
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const [kind, voteId, choiceId] = (interaction.data?.custom_id ?? "").split(":");
      if (kind !== "vote" || !voteId || !choiceId) return ephemeral("Bouton inconnu.");
      const result = await castBallot(voteId, user.id, choiceId);
      after(async () => {
        await syncVoteMessage(voteId);
        if (result) await announceResolution(result);
      });
      return ephemeral(result ? "Vote enregistré — le vote est clos !" : "Vote enregistré ✅");
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
        const { result, before, after: top } = await withLeaderWatch(team?.challengeId, () => logBook(actor, parsed.data));
        if (team) after(() => announceRankChange(team.challengeId, before, top));
        if (team && result.cell?.grid) after(() => announceGridChange(team.id, result.cell!.grid!));
        return publicReply(describe(discordUser.username, result, "a terminé"));
      }
      case "modifier-un-livre": {
        if (!inTeamChannel) return teamChannelOnly();
        const bookId = String(opts.livre ?? "");
        if (!bookId) return ephemeral("Choisis un livre dans la liste.");
        if (opts.supprimer === true) {
          const { before, after: top } = await withLeaderWatch(team?.challengeId, () => deleteBook(actor, bookId));
          if (team) after(() => announceRankChange(team.challengeId, before, top));
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
        const { result, before, after: top } = await withLeaderWatch(team?.challengeId, () => updateBook(actor, bookId, patch.data));
        if (team) after(() => announceRankChange(team.challengeId, before, top));
        if (team && result.cell?.grid) after(() => announceGridChange(team.id, result.cell!.grid!));
        return publicReply(describe(discordUser.username, result, "a modifié"));
      }
      case "score": {
        const challenge = team?.challenge ?? (await prisma.challenge.findFirst({ where: { status: "ACTIVE" } }));
        if (!challenge) return ephemeral("Aucun défi actif.");
        const rows = await getLeaderboard(challenge.id);
        const medals = ["🥇", "🥈", "🥉"];
        return publicReply(`🏆 **Classement — ${challenge.name}**\n${rows.map((r) => `${medals[r.rank - 1] ?? `${r.rank}.`} **${r.name}**${rows.filter((o) => o.rank === r.rank).length > 1 ? " (ex æquo)" : ""} — ${fmtPoints(r.points)} pts (${r.books} romans, ${r.graphics} graphiques)`).join("\n")}`);
      }
      case "quete": {
        if (!team) return ephemeral("Rejoins une équipe d'abord.");
        const quests = (await listQuestsForTeam(team.challengeId, team.id)).filter((q) => q.open);
        if (!quests.length) return ephemeral("Aucune quête ouverte.");
        return ephemeral(
          `🗺️ **Quêtes ouvertes — ${team.name}**\n${quests
            .map((q) => `${q.done ? "✅" : q.progress > 0 ? "◐" : "▫️"} **#${q.number} — ${q.title}** — ${q.points} pts${q.linkedBooks.length ? ` (${q.linkedBooks.map((b) => `${b.owner} — ${b.title}${b.type === "GRAPHIQUE" ? " ½" : ""}`).join(" / ")})` : ""}`)
            .join("\n")}\n\nUne quête se valide avec un roman, ou deux graphiques : option *quete* de \`/ajouter-un-livre\`.`,
        );
      }
      case "histoire": {
        if (!team) return ephemeral("Rejoins une équipe d'abord.");
        const view = await getTeamStoryView(team.id, user.id);
        if (!view) return ephemeral("L'histoire n'a pas encore commencé.");
        if (view.vote?.status === "OPEN") after(() => syncVoteMessage(view.vote!.id));
        return ephemeral(
          `📖 **${view.node.title}**\n${view.node.body.slice(0, 800)}${view.node.body.length > 800 ? "…" : ""}\n\n${
            view.vote?.status === "OPEN" ? `🗳️ Vote en cours (${view.vote.ballots} vote${view.vote.ballots > 1 ? "s" : ""}) → ${appUrl()}/story` : view.unmet.length ? `🔒 À faire : ${view.unmet.join(" ; ")}` : view.node.isEnding ? "✨ Fin de l'histoire." : ""
          }`,
        );
      }
      default:
        return ephemeral("Commande inconnue.");
    }
  } catch (e) {
    return ephemeral(`❌ ${e instanceof Error ? e.message : "Erreur"}`);
  }
}
