import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { announceResolution, syncVoteMessage } from "@/lib/discord/events";
import { bookSchema, logBook } from "@/lib/services/books";
import { getLeaderboard } from "@/lib/services/leaderboard";
import { completeQuest, listQuestsForPlayer } from "@/lib/services/quests";
import { castBallot, getTeamStoryView } from "@/lib/services/story";

/**
 * Discord HTTP interactions: slash commands and vote buttons.
 * Discord signs every request with the app's public key; anything unsigned is rejected.
 */

const ephemeral = (content: string) =>
  NextResponse.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content, flags: 64 } });
const publicReply = (content: string) => NextResponse.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content } });

type Option = { name: string; value: string | number };
type Interaction = {
  type: number;
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
  if (!player) return ephemeral(`Tu n'es pas encore inscrit·e : connecte-toi d'abord sur ${appUrl()}`);
  const { user, team } = player;

  try {
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
    const opts = Object.fromEntries((interaction.data?.options ?? []).map((o) => [o.name, o.value]));

    switch (interaction.data?.name) {
      case "livre": {
        const parsed = bookSchema.safeParse({ title: opts.titre, author: opts.auteur, pages: opts.pages });
        if (!parsed.success) return ephemeral(`Paramètres invalides : ${parsed.error.issues[0]?.message}`);
        const { points } = await logBook(user.id, parsed.data);
        return publicReply(`📚 **${discordUser.username}** a terminé *${parsed.data.title}* (${parsed.data.pages} p.) → +${points} pts pour ${team?.name ?? "personne (pas d'équipe)"}`);
      }
      case "score": {
        const challenge = team?.challenge ?? (await prisma.challenge.findFirst({ where: { status: "ACTIVE" } }));
        if (!challenge) return ephemeral("Aucun défi actif.");
        const rows = await getLeaderboard(challenge.id);
        const medals = ["🥇", "🥈", "🥉"];
        return publicReply(`🏆 **Classement — ${challenge.name}**\n${rows.map((r) => `${medals[r.rank - 1] ?? `${r.rank}.`} **${r.name}** — ${r.points} pts (${r.books} livres)`).join("\n")}`);
      }
      case "quete": {
        const challenge = team?.challenge;
        if (!challenge) return ephemeral("Rejoins une équipe d'abord.");
        const quests = (await listQuestsForPlayer(challenge.id, user.id, team.id)).filter((q) => q.open);
        if (!quests.length) return ephemeral("Aucune quête ouverte.");
        return ephemeral(
          `🗺️ **Quêtes ouvertes**\n${quests.map((q) => `${q.done ? "✅" : "▫️"} \`${q.id.slice(-6)}\` **${q.title}** — ${q.points} pts (${q.type === "TEAM" ? "équipe" : "individuelle"})`).join("\n")}\n\nValider : \`/quete-fait id:<6 derniers caractères>\``,
        );
      }
      case "quete-fait": {
        if (!team) return ephemeral("Rejoins une équipe d'abord.");
        const suffix = String(opts.id ?? "").trim();
        const quest = await prisma.quest.findFirst({ where: { challengeId: team.challengeId, id: { endsWith: suffix } } });
        if (!quest || suffix.length < 4) return ephemeral("Quête introuvable. Utilise `/quete` pour voir les identifiants.");
        const r = await completeQuest(quest.id, { id: user.id, role: user.role, teamId: team.id, isCaptain: team.captainId === user.id });
        return r.already ? ephemeral("Déjà validée.") : publicReply(`🗺️ **${discordUser.username}** a validé la quête *${quest.title}* → +${r.points} pts pour ${team.name}`);
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
