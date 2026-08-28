import "server-only";
import { prisma } from "@/lib/db";
import { editMessage, postMessage, type MessageButton } from "@/lib/discord/rest";
import { fmtPoints } from "@/lib/format";
import { getLeaderboard } from "@/lib/services/leaderboard";
import { getTeamChapterStatus, type ResolutionSummary } from "@/lib/services/story";

const appUrl = () => process.env.AUTH_URL ?? "https://aceep-challenger.vercel.app";
const COLOR = { story: 0x6366f1, quest: 0xd97706, rank: 0x16a34a, effect: 0xdc2626 };

async function channelsFor(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId }, include: { challenge: true } });
  return { team: team?.discordChannelId ?? null, general: team?.challenge.discordGeneralChannelId ?? null, name: team?.name ?? "?" };
}

/** Vote opened or updated: post/edit the team-channel message with buttons and named tally. */
export async function syncVoteMessage(voteId: string) {
  const vote = await prisma.vote.findUnique({
    where: { id: voteId },
    include: {
      team: true,
      node: { include: { choices: { orderBy: { sortOrder: "asc" } } } },
      ballots: { include: { user: { select: { name: true } } } },
    },
  });
  if (!vote || !vote.team.discordChannelId) return;
  const done = await prisma.questCompletion.findMany({ where: { teamId: vote.teamId }, select: { questId: true } });
  const doneIds = new Set(done.map((d) => d.questId));

  const lines = vote.node.choices.map((c) => {
    const names = vote.ballots.filter((b) => b.choiceId === c.id).map((b) => b.user.name ?? "?");
    const locked = !!c.lockedByQuestId && !doneIds.has(c.lockedByQuestId);
    return `${locked ? "🔒" : "▫️"} **${c.label}** — ${names.length} vote${names.length > 1 ? "s" : ""}${names.length ? ` (${names.join(", ")})` : ""}`;
  });
  const buttons: MessageButton[] = vote.node.choices.map((c, i) => ({
    customId: `vote:${vote.id}:${c.id}`,
    label: `${i + 1}. ${c.label}`,
    style: 1,
    disabled: vote.status !== "OPEN" || (!!c.lockedByQuestId && !doneIds.has(c.lockedByQuestId)),
  }));
  const closed = vote.status !== "OPEN";
  const message = {
    embeds: [
      {
        title: `📖 ${vote.node.title}`,
        description: `${vote.node.body.slice(0, 1500)}${vote.node.body.length > 1500 ? "…" : ""}\n\n${lines.join("\n")}\n\n${
          closed ? "✅ Vote clos." : `⏳ Vote ouvert jusqu'au <t:${Math.floor(vote.deadline.getTime() / 1000)}:F>`
        }`,
        color: COLOR.story,
        url: `${appUrl()}/story`,
      },
    ],
    buttons,
  };
  if (vote.discordMessageId) {
    await editMessage(vote.team.discordChannelId, vote.discordMessageId, message);
  } else {
    const id = await postMessage(vote.team.discordChannelId, message);
    if (id) await prisma.vote.update({ where: { id: vote.id }, data: { discordMessageId: id } });
  }
}

/** Vote resolved: close the vote message, announce in team channel, and effects on rivals in general. */
export async function announceResolution(r: ResolutionSummary | null) {
  if (!r) return;
  const vote = await prisma.vote.findFirst({ where: { teamId: r.teamId }, orderBy: { createdAt: "desc" } });
  if (vote) await syncVoteMessage(vote.id);

  const ch = await channelsFor(r.teamId);
  if (r.awaitingTarget) {
    await postMessage(ch.team, { content: `🗳️ Choix retenu : **${r.choiceLabel}**. Le·la capitaine doit désigner l'équipe visée sur ${appUrl()}/story` });
    return;
  }
  const howLabel = r.how === "default" ? " (choix par défaut, délai écoulé)" : r.how === "tie-break" ? " (égalité tranchée)" : "";
  await postMessage(ch.team, {
    embeds: [
      {
        title: `🗳️ Décision : ${r.choiceLabel}${howLabel}`,
        description: [r.nextTitle ? `Chapitre suivant : **${r.nextTitle}**` : "Fin de votre histoire.", ...r.effects.map((e) => `• ${e}`)].join("\n"),
        color: COLOR.story,
        url: `${appUrl()}/story`,
      },
    ],
  });
  if (r.effects.length && ch.general) {
    await postMessage(ch.general, { embeds: [{ title: `⚔️ ${r.teamName} a agi dans l'histoire`, description: r.effects.map((e) => `• ${e}`).join("\n"), color: COLOR.effect }] });
  }
  // Cross effects are signalled in every affected team's aventure channel.
  for (const teamId of r.affectedTeamIds) {
    const other = await channelsFor(teamId);
    await postMessage(other.team, { embeds: [{ title: `⚔️ L'histoire de ${r.teamName} vous touche`, description: r.effects.map((e) => `• ${e}`).join("\n"), color: COLOR.effect, url: `${appUrl()}/team` }] });
  }
  // A new vote may have opened on the next chapter; otherwise post the chapter itself (ending or gated).
  const next = await prisma.vote.findFirst({ where: { teamId: r.teamId, status: "OPEN" } });
  if (next) {
    if (!next.discordMessageId) await syncVoteMessage(next.id);
    return;
  }
  const chapter = await getTeamChapterStatus(r.teamId);
  if (!chapter || !r.nextTitle) return;
  await postMessage(ch.team, {
    embeds: [
      {
        title: `📖 ${chapter.title}`,
        description: `${chapter.body.slice(0, 1500)}${chapter.body.length > 1500 ? "…" : ""}\n\n${
          chapter.isEnding ? "✨ Fin de votre histoire." : `🔒 Pour continuer : ${chapter.unmet.join(" ; ")}`
        }`,
        color: COLOR.story,
        url: `${appUrl()}/story`,
      },
    ],
  });
}

export async function announceQuest(questId: string) {
  const q = await prisma.quest.findUnique({ where: { id: questId }, include: { challenge: true, targetTeam: true } });
  if (!q) return;
  const channel = q.targetTeam ? q.targetTeam.discordChannelId : q.challenge.discordGeneralChannelId;
  await postMessage(channel, {
    embeds: [
      {
        title: `🗺️ Nouvelle quête #${q.number} : ${q.title}`,
        description: `${q.description || ""}\n\nQuête d'équipe, à valider avec une lecture (option *quete* de \`/ajouter-un-livre\`) · **${q.points} pts**${q.closeAt ? ` · jusqu'au <t:${Math.floor(q.closeAt.getTime() / 1000)}:F>` : ""}`,
        color: COLOR.quest,
        url: `${appUrl()}/quests`,
      },
    ],
  });
}

/** Called after any scoring action: announces when the top of the leaderboard changes hands. */
export async function announceRankChange(challengeId: string, before: { teamId: string; name: string }[], after: { teamId: string; name: string }[]) {
  if (!before.length || !after.length || before[0].teamId === after[0].teamId) return;
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  await postMessage(challenge?.discordGeneralChannelId, {
    embeds: [{ title: "🏆 Changement de leader !", description: `**${after[0].name}** passe devant **${before[0].name}**.`, color: COLOR.rank, url: `${appUrl()}/leaderboard` }],
  });
}

/** Posted in the team's aventure channel when it finishes a grid (and the next one opens). */
export async function announceGridChange(teamId: string, grid: { completed: true; next: { order: number; title: string } | null }) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return;
  await postMessage(team.discordChannelId, {
    embeds: [
      {
        title: "🏆 Grille de bingo terminée !",
        description: grid.next ? `Toutes les cases sont validées. La grille ${grid.next.order} « ${grid.next.title} » est ouverte : à vous de jouer !` : "Toutes les cases sont validées — et c'était la dernière grille. Bravo !",
        color: COLOR.rank,
        url: `${appUrl()}/bingo`,
      },
    ],
  });
}

async function generalChannel(challengeId: string) {
  const c = await prisma.challenge.findUnique({ where: { id: challengeId } });
  return c?.discordGeneralChannelId ?? null;
}

/** Sunday verification window opening / closing (general channel). */
export async function announceWindow(challengeId: string, kind: "open" | "close") {
  await postMessage(await generalChannel(challengeId), {
    content:
      kind === "open"
        ? "🔍 **Fenêtre de vérification ouverte** (dimanche 19 h – 21 h). Ajouts, modifications et suppressions de lectures sont suspendus : capitaines, c'est le moment de vérifier les lectures de votre équipe. Le classement tombe à 20 h."
        : "✅ **Fenêtre de vérification fermée.** Les commandes sont de nouveau disponibles — bonne semaine de lecture !",
  });
}

/** Weekly leaderboard (Sunday 20:00 Paris), with a late notice when caught up afterwards. */
export async function announceWeekly(challengeId: string, sunday: string, late: boolean) {
  const rows = await getLeaderboard(challengeId);
  if (!rows.length) return;
  const medals = ["🥇", "🥈", "🥉"];
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(`${sunday}T12:00:00Z`));
  const lines = rows.map((r) => {
    const tied = rows.filter((o) => o.rank === r.rank).length > 1;
    return `${medals[r.rank - 1] ?? `${r.rank}.`} **${r.name}**${tied ? " (ex æquo)" : ""} — ${fmtPoints(r.points)} pts · ${r.books} roman${r.books > 1 ? "s" : ""}, ${r.graphics} graphique${r.graphics > 1 ? "s" : ""}`;
  });
  await postMessage(await generalChannel(challengeId), {
    embeds: [
      {
        title: `🏆 Classement du dimanche ${date}`,
        description: `${lines.join("\n")}${late ? "\n\n_Publié en retard — le bot n'était pas disponible à 20 h._" : ""}`,
        color: COLOR.rank,
        url: `${appUrl()}/leaderboard`,
      },
    ],
  });
}

/** Tie cascade reminder in the team's aventure channel when a new stage is reached. */
export async function announceTieStage(v: { channelId: string | null; stage: "CAPTAIN" | "DEPUTY" | "ANY"; pending: boolean }) {
  const text =
    v.stage === "CAPTAIN"
      ? "⚖️ **Égalité au vote !** Le·la capitaine a 5 h pour trancher (les compteurs sont en pause de minuit à 8 h)."
      : v.stage === "DEPUTY"
        ? "⚖️ Le·la capitaine n'a pas tranché : l'**adjoint·e** a 5 h pour le faire."
        : v.pending
          ? "⚖️ Un choix attend la confirmation d'un·e admin."
          : "⚖️ Personne n'a tranché : le **premier membre** qui se manifeste choisit, avec l'accord d'un·e admin.";
  await postMessage(v.channelId, { content: `${text} → ${appUrl()}/story` });
}

/** Weekly nudge for a team stuck on a chapter. */
export async function announceDormant(d: { channelId: string | null; title: string; reason: string }) {
  await postMessage(d.channelId, { content: `📖 Votre histoire attend au chapitre **${d.title}** depuis plus d'une semaine${d.reason ? ` — ${d.reason}` : ""}. → ${appUrl()}/story` });
}
