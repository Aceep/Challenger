import "server-only";
import { prisma } from "@/lib/db";
import { editMessage, postMessage, type MessageButton } from "@/lib/discord/rest";
import { getTeamChapterStatus, type ResolutionSummary } from "@/lib/services/story";

const appUrl = () => process.env.AUTH_URL ?? "https://challenge-six-rose.vercel.app";
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
  await postMessage(ch.team, {
    embeds: [
      {
        title: `🗳️ Décision : ${r.choiceLabel}`,
        description: [r.nextTitle ? `Chapitre suivant : **${r.nextTitle}**` : "Fin de votre histoire.", ...r.effects.map((e) => `• ${e}`)].join("\n"),
        color: COLOR.story,
        url: `${appUrl()}/story`,
      },
    ],
  });
  if (r.effects.length && ch.general) {
    await postMessage(ch.general, { embeds: [{ title: `⚔️ ${r.teamName} a agi dans l'histoire`, description: r.effects.map((e) => `• ${e}`).join("\n"), color: COLOR.effect }] });
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
        title: `🗺️ Nouvelle quête : ${q.title}`,
        description: `${q.description || ""}\n\n${q.type === "TEAM" ? "Quête d'équipe" : "Quête individuelle"} · **${q.points} pts**${q.closeAt ? ` · jusqu'au <t:${Math.floor(q.closeAt.getTime() / 1000)}:F>` : ""}`,
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
