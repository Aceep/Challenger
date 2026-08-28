import { GameError } from "@/lib/errors";
import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { completedLines } from "@/lib/scoring/bingo";
import { activeGridForTeam, completePositions } from "@/lib/services/bingo";
import { awardPoints } from "@/lib/services/points";
import { getTeamScore } from "@/lib/services/leaderboard";
import { roleIn } from "@/lib/services/membership";
import { describeEffect, needsTargetTeam, parseEffects, effectsSchema, type Effect } from "@/lib/story/effects";
import { canBreakTie, resolveVote, tieCascadeStage, unmetConditions, type TieStage } from "@/lib/story/vote";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// ---------------------------------------------------------------------------
// Admin: story / nodes / choices
// ---------------------------------------------------------------------------

export const storySchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(120),
  voteHours: z.coerce.number().int().min(1).max(720),
});

export function upsertStory(challengeId: string, input: z.infer<typeof storySchema>) {
  return prisma.story.upsert({ where: { challengeId }, create: { challengeId, ...input }, update: input });
}

export const nodeSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(120),
  body: z.string().trim().min(1, "Texte requis").max(20000),
  sortOrder: z.coerce.number().int().default(0),
  requiredQuestId: z.string().optional().transform((s) => s || null),
  requiredBingoLines: z.coerce.number().int().min(0).optional().transform((n) => n || null),
  requiredPoints: z.coerce.number().int().min(0).optional().transform((n) => n || null),
  /** Vote duration override in hours (empty = story default). */
  voteHours: z.coerce.number().int().min(1).max(720).optional().transform((n) => n || null),
  /** Choice applied when the vote expires without a clear majority. */
  defaultChoiceId: z.string().optional().transform((s) => s || null),
});

export async function createNode(storyId: string, input: z.infer<typeof nodeSchema>) {
  const node = await prisma.storyNode.create({ data: { storyId, ...input } });
  // First node becomes the start automatically.
  await prisma.story.updateMany({ where: { id: storyId, startNodeId: null }, data: { startNodeId: node.id } });
  return node;
}

export function updateNode(id: string, input: z.infer<typeof nodeSchema>) {
  return prisma.storyNode.update({ where: { id }, data: input });
}

export function deleteNode(id: string) {
  return prisma.storyNode.delete({ where: { id } });
}

export function setStartNode(storyId: string, nodeId: string) {
  return prisma.story.update({ where: { id: storyId }, data: { startNodeId: nodeId } });
}

export const choiceSchema = z.object({
  label: z.string().trim().min(1, "Libellé requis").max(200),
  targetNodeId: z.string().optional().transform((s) => s || null),
  lockedByQuestId: z.string().optional().transform((s) => s || null),
  sortOrder: z.coerce.number().int().default(0),
  effects: z
    .string()
    .trim()
    .default("[]")
    .transform((s, ctx) => {
      try {
        const parsed = effectsSchema.safeParse(JSON.parse(s || "[]"));
        if (!parsed.success) {
          ctx.addIssue({ code: "custom", message: "Effets invalides : " + parsed.error.issues[0]?.message });
          return z.NEVER;
        }
        return parsed.data;
      } catch {
        ctx.addIssue({ code: "custom", message: "Effets : JSON invalide" });
        return z.NEVER;
      }
    }),
});

export function createChoice(nodeId: string, input: z.infer<typeof choiceSchema>) {
  return prisma.storyChoice.create({ data: { nodeId, ...input } });
}

export function updateChoice(id: string, input: z.infer<typeof choiceSchema>) {
  return prisma.storyChoice.update({ where: { id }, data: input });
}

export function deleteChoice(id: string) {
  return prisma.storyChoice.delete({ where: { id } });
}

export function getStoryAdmin(challengeId: string) {
  return prisma.story.findUnique({
    where: { challengeId },
    include: {
      nodes: {
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        include: { choices: { orderBy: { sortOrder: "asc" }, include: { target: { select: { title: true } } } }, _count: { select: { teamStates: true } } },
      },
    },
  });
}

/** Admin: send a team back to the start (clears its votes and history). */
export async function resetTeamStory(teamId: string) {
  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { teamId } }),
    prisma.storyVisit.deleteMany({ where: { teamId } }),
    prisma.teamStoryState.deleteMany({ where: { teamId } }),
  ]);
}

// ---------------------------------------------------------------------------
// Team progress helpers
// ---------------------------------------------------------------------------

async function teamProgress(tx: Tx, teamId: string, challengeId: string) {
  void challengeId;
  const [completions, grid, points] = await Promise.all([
    tx.questCompletion.findMany({ where: { teamId }, select: { questId: true } }),
    activeGridForTeam(tx, teamId),
    getTeamScore(teamId),
  ]);
  // Lines are counted on the team's active grid.
  const bingoLines = grid ? completedLines(await completePositions(tx, grid.id, teamId), grid.size).length : 0;
  return { completedQuestIds: completions.map((c) => c.questId), bingoLines, points };
}

export async function alliedTeamIds(teamId: string): Promise<string[]> {
  const rows = await prisma.alliance.findMany({ where: { OR: [{ teamAId: teamId }, { teamBId: teamId }] } });
  return rows.map((a) => (a.teamAId === teamId ? a.teamBId : a.teamAId));
}

async function eligibleVoterIds(tx: Tx, teamId: string): Promise<string[]> {
  const allies = await tx.alliance.findMany({ where: { OR: [{ teamAId: teamId }, { teamBId: teamId }] } });
  const teamIds = [teamId, ...allies.map((a) => (a.teamAId === teamId ? a.teamBId : a.teamAId))];
  const members = await tx.teamMember.findMany({ where: { teamId: { in: teamIds } }, select: { userId: true } });
  return members.map((m) => m.userId);
}

// ---------------------------------------------------------------------------
// Team view + vote lifecycle
// ---------------------------------------------------------------------------

/**
 * Makes sure the team has a position and, when the current chapter has
 * choices and gating is met, an open vote. Resolves an expired vote first.
 */
export async function ensureTeamStory(teamId: string) {
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, include: { challenge: { include: { story: true } } } });
  const story = team.challenge.story;
  if (!story?.startNodeId) return null;

  let state = await prisma.teamStoryState.findUnique({ where: { teamId } });
  if (!state) {
    state = await prisma.teamStoryState.create({ data: { teamId, currentNodeId: story.startNodeId } });
    await prisma.storyVisit.create({ data: { teamId, nodeId: story.startNodeId } });
  }

  const open = await prisma.vote.findFirst({ where: { teamId, status: "OPEN" } });
  if (open) {
    await tryResolveVote(open.id);
  } else {
    const awaiting = await prisma.vote.findFirst({ where: { teamId, status: "AWAITING_TARGET" } });
    if (!awaiting) await openVoteIfReady(teamId, state.currentNodeId, team.challengeId, story.voteHours);
  }
  return story;
}

async function openVoteIfReady(teamId: string, nodeId: string, challengeId: string, voteHours: number) {
  const node = await prisma.storyNode.findUniqueOrThrow({ where: { id: nodeId }, include: { choices: true } });
  if (node.choices.length === 0) return null;
  const progress = await teamProgress(prisma, teamId, challengeId);
  if (unmetConditions(node, progress).length > 0) return null;
  const already = await prisma.vote.findFirst({ where: { teamId, nodeId, status: { not: "RESOLVED" } } });
  if (already) return already;
  // A vote already resolved on this chapter since the team arrived here means the winning choice
  // had no next chapter (dead end): do not reopen the same vote every deadline — the chapter waits
  // for the admin to give the choice a target.
  const arrival = await prisma.storyVisit.findFirst({ where: { teamId, nodeId }, orderBy: { arrivedAt: "desc" } });
  const settled = await prisma.vote.findFirst({ where: { teamId, nodeId, status: "RESOLVED", createdAt: { gte: arrival?.arrivedAt ?? new Date(0) } } });
  if (settled) return null;
  return prisma.vote.create({ data: { teamId, nodeId, deadline: new Date(Date.now() + (node.voteHours ?? voteHours) * 3600_000) } });
}

export async function getTeamStoryView(teamId: string, userId: string) {
  const story = await ensureTeamStory(teamId);
  if (!story) return null;

  const [state, team] = await Promise.all([
    prisma.teamStoryState.findUniqueOrThrow({
      where: { teamId },
      include: { currentNode: { include: { choices: { orderBy: { sortOrder: "asc" } } } } },
    }),
    prisma.team.findUniqueOrThrow({ where: { id: teamId }, include: { challenge: true } }),
  ]);
  const node = state.currentNode;
  const progress = await teamProgress(prisma, teamId, team.challengeId);
  const requiredQuest = node.requiredQuestId ? await prisma.quest.findUnique({ where: { id: node.requiredQuestId }, select: { title: true } }) : null;
  const unmet = unmetConditions(node, progress, requiredQuest?.title);

  const vote = await prisma.vote.findFirst({
    where: { teamId, status: { not: "RESOLVED" } },
    include: { ballots: { include: { user: { select: { name: true } } } }, resultChoice: true, team: { select: { captainId: true, deputyId: true } } },
  });
  const tie = vote && vote.status === "OPEN" && vote.tieStage !== "NONE" && vote.tieSince ? tieInfo(vote, userId, node.choices.map((c) => c.id)) : null;
  const lockQuestIds = node.choices.map((c) => c.lockedByQuestId).filter((x): x is string => !!x);
  const lockQuests = lockQuestIds.length ? await prisma.quest.findMany({ where: { id: { in: lockQuestIds } }, select: { id: true, title: true } }) : [];

  const choices = node.choices.map((c) => {
    const locked = !!c.lockedByQuestId && !progress.completedQuestIds.includes(c.lockedByQuestId);
    return {
      id: c.id,
      label: c.label,
      locked,
      lockReason: locked ? `Débloquée par la quête « ${lockQuests.find((q) => q.id === c.lockedByQuestId)?.title ?? "?"} »` : null,
      effects: parseEffects(c.effects).map((e) => describeEffect(e, { self: team.name })),
      votes: vote ? vote.ballots.filter((b) => b.choiceId === c.id).map((b) => b.user.name ?? "?") : [],
    };
  });

  const [history, rivals, allies] = await Promise.all([
    prisma.storyVisit.findMany({ where: { teamId }, orderBy: { arrivedAt: "asc" }, include: { node: { select: { title: true } } } }),
    prisma.team.findMany({ where: { challengeId: team.challengeId, id: { not: teamId } }, select: { id: true, name: true } }),
    alliedTeamIds(teamId),
  ]);

  return {
    story,
    team,
    node: { id: node.id, title: node.title, body: node.body, isEnding: node.choices.length === 0 },
    unmet,
    choices,
    vote: vote
      ? {
          id: vote.id,
          status: vote.status,
          deadline: vote.deadline,
          myChoiceId: vote.ballots.find((b) => b.userId === userId)?.choiceId ?? null,
          ballots: vote.ballots.length,
          resultChoice: vote.resultChoice ? { id: vote.resultChoice.id, label: vote.resultChoice.label } : null,
          tie,
        }
      : null,
    isCaptain: team.captainId === userId,
    history: history.map((h) => ({ title: h.node.title, choiceLabel: h.choiceLabel, at: h.arrivedAt })),
    rivals,
    allies: rivals.filter((r) => allies.includes(r.id)),
  };
}

/** Current chapter of a team with its gating status — used for Discord posts. */
export async function getTeamChapterStatus(teamId: string) {
  const state = await prisma.teamStoryState.findUnique({ where: { teamId }, include: { currentNode: { include: { choices: { select: { id: true } } } }, team: true } });
  if (!state) return null;
  const progress = await teamProgress(prisma, teamId, state.team.challengeId);
  const q = state.currentNode.requiredQuestId ? await prisma.quest.findUnique({ where: { id: state.currentNode.requiredQuestId }, select: { title: true } }) : null;
  return {
    title: state.currentNode.title,
    body: state.currentNode.body,
    isEnding: state.currentNode.choices.length === 0,
    unmet: unmetConditions(state.currentNode, progress, q?.title),
  };
}

export async function castBallot(voteId: string, userId: string, choiceId: string) {
  return prisma.$transaction(async (tx) => {
    const vote = await tx.vote.findUniqueOrThrow({ where: { id: voteId }, include: { node: { include: { choices: true } }, team: true } });
    if (vote.status !== "OPEN") throw new GameError("Ce vote est clos");
    const voters = await eligibleVoterIds(tx, vote.teamId);
    if (!voters.includes(userId)) throw new GameError("Tu ne peux pas voter pour cette équipe");
    const choice = vote.node.choices.find((c) => c.id === choiceId);
    if (!choice) throw new GameError("Choix inconnu");
    if (choice.lockedByQuestId) {
      const done = await tx.questCompletion.findFirst({ where: { questId: choice.lockedByQuestId, teamId: vote.teamId } });
      if (!done) throw new GameError("Ce choix est encore verrouillé");
    }
    await tx.voteBallot.upsert({
      where: { voteId_userId: { voteId, userId } },
      create: { voteId, userId, choiceId },
      update: { choiceId },
    });
  }).then(() => tryResolveVote(voteId));
}

export type ResolutionSummary = {
  teamId: string;
  teamName: string;
  choiceLabel: string;
  nextTitle: string | null;
  effects: string[];
  awaitingTarget: boolean;
  how: "majority" | "default" | "tie-break";
  /** Other teams touched by the effects (posted in their aventure channel). */
  affectedTeamIds: string[];
};

/** Resolves the vote if everyone voted or the deadline passed. */
export async function tryResolveVote(voteId: string, now = new Date()): Promise<ResolutionSummary | null> {
  const vote = await prisma.vote.findUniqueOrThrow({
    where: { id: voteId },
    include: { ballots: true, node: { include: { choices: { orderBy: { sortOrder: "asc" } } } }, team: true },
  });
  if (vote.status !== "OPEN") return null;

  const voters = await eligibleVoterIds(prisma, vote.teamId);
  const progress = await teamProgress(prisma, vote.teamId, vote.team.challengeId);
  const votable = vote.node.choices.filter((c) => !c.lockedByQuestId || progress.completedQuestIds.includes(c.lockedByQuestId));
  const result = resolveVote({
    ballots: vote.ballots,
    choiceIds: votable.map((c) => c.id),
    defaultChoiceId: vote.node.defaultChoiceId,
    eligibleCount: voters.length,
    deadline: vote.deadline,
    now,
  });
  if (result.status === "tie") {
    if (vote.tieStage === "NONE") await prisma.vote.update({ where: { id: voteId }, data: { tieStage: "CAPTAIN", tieSince: now } });
    return null;
  }
  if (result.status !== "resolved") return null;

  const choice = votable.find((c) => c.id === result.choiceId)!;
  return settleChoice(vote, choice, result.how);
}

type TieVote = { tieStage: TieStage | "NONE"; tieSince: Date | null; team: { captainId: string | null; deputyId: string | null }; ballots: { choiceId: string }[]; pendingChoiceId: string | null; pendingById: string | null };

function tieInfo(vote: TieVote, userId: string, choiceIds: string[]) {
  const stage = tieCascadeStage(vote.tieSince!, new Date());
  const t: Record<string, number> = Object.fromEntries(choiceIds.map((id) => [id, 0]));
  for (const b of vote.ballots) if (b.choiceId in t) t[b.choiceId]++;
  const max = Math.max(0, ...Object.values(t));
  const leaders = choiceIds.filter((id) => t[id] === max);
  const role = vote.team.captainId === userId ? "captain" : vote.team.deputyId === userId ? "deputy" : "member";
  return { stage, leaders, canBreak: canBreakTie(stage, role), role, pendingChoiceId: vote.pendingChoiceId, pendingById: vote.pendingById } as const;
}

/** Applies the winning choice: pauses for a rival pick when needed, otherwise resolves. */
async function settleChoice(vote: { id: string; teamId: string; team: { name: string } }, choice: { id: string; label: string; effects: unknown }, how: "majority" | "default" | "tie-break"): Promise<ResolutionSummary | null> {
  const voteId = vote.id;
  const effects = parseEffects(choice.effects);
  if (needsTargetTeam(effects)) {
    await prisma.vote.update({ where: { id: voteId }, data: { status: "AWAITING_TARGET", resultChoiceId: choice.id } });
    return { teamId: vote.teamId, teamName: vote.team.name, choiceLabel: choice.label, nextTitle: null, effects: [], awaitingTarget: true, how, affectedTeamIds: [] };
  }
  return applyResolution(voteId, choice.id, null, how);
}

/**
 * Tie cascade: captain (5 active h) → deputy (5 more) → any member, whose pick
 * needs an admin confirmation. Admins may settle a tie at any time.
 */
export async function breakTie(voteId: string, userId: string, choiceId: string): Promise<ResolutionSummary | null> {
  const vote = await prisma.vote.findUniqueOrThrow({ where: { id: voteId }, include: { team: true, ballots: true, node: { include: { choices: { orderBy: { sortOrder: "asc" } } } } } });
  if (vote.status !== "OPEN" || vote.tieStage === "NONE" || !vote.tieSince) throw new GameError("Pas d'égalité à trancher");
  const info = tieInfo(vote, userId, vote.node.choices.map((c) => c.id));
  if (!info.leaders.includes(choiceId)) throw new GameError("Choisis l'un des choix à égalité");
  const role = (await roleIn(userId, vote.team.challengeId)) === "ORGANIZER" ? "admin" : info.role;
  if (!canBreakTie(info.stage, role)) {
    throw new GameError(info.stage === "CAPTAIN" ? "Le·la capitaine a 5 h pour trancher" : info.stage === "DEPUTY" ? "L'adjoint·e a 5 h pour trancher" : "Tu ne peux pas trancher");
  }
  if (role === "member") {
    if (vote.pendingChoiceId) throw new GameError("Un choix attend déjà la confirmation de l'organisation");
    await prisma.vote.update({ where: { id: voteId }, data: { pendingChoiceId: choiceId, pendingById: userId } });
    return null;
  }
  const choice = vote.node.choices.find((c) => c.id === choiceId)!;
  return settleChoice(vote, choice, "tie-break");
}

/** An organiser confirms (or rejects) the pick made by the first member to act. */
export async function confirmTieBreak(voteId: string, adminId: string, accept: boolean): Promise<ResolutionSummary | null> {
  const vote = await prisma.vote.findUniqueOrThrow({ where: { id: voteId }, include: { team: true, node: { include: { choices: true } } } });
  if ((await roleIn(adminId, vote.team.challengeId)) !== "ORGANIZER") throw new GameError("Réservé à l'organisation");
  if (vote.status !== "OPEN" || !vote.pendingChoiceId) throw new GameError("Rien à confirmer");
  if (!accept) {
    await prisma.vote.update({ where: { id: voteId }, data: { pendingChoiceId: null, pendingById: null } });
    return null;
  }
  const choice = vote.node.choices.find((c) => c.id === vote.pendingChoiceId)!;
  return settleChoice(vote, choice, "tie-break");
}

/** Captain picks the rival for hostile/alliance effects, then the resolution applies. */
export async function chooseTargetTeam(voteId: string, userId: string, targetTeamId: string) {
  const vote = await prisma.vote.findUniqueOrThrow({ where: { id: voteId }, include: { team: true } });
  if (vote.status !== "AWAITING_TARGET" || !vote.resultChoiceId) throw new GameError("Rien à cibler");
  if (vote.team.captainId !== userId && (await roleIn(userId, vote.team.challengeId)) !== "ORGANIZER") {
    throw new GameError("Seul·e le·la capitaine choisit la cible");
  }
  if (targetTeamId === vote.teamId) throw new GameError("Choisis une autre équipe");
  // A rival is always a team of the same challenge.
  const target = await prisma.team.findUnique({ where: { id: targetTeamId }, select: { challengeId: true } });
  if (!target || target.challengeId !== vote.team.challengeId) throw new GameError("Choisis une équipe de ce défi");
  return applyResolution(voteId, vote.resultChoiceId, targetTeamId, "majority");
}

async function applyResolution(voteId: string, choiceId: string, targetTeamId: string | null, how: ResolutionSummary["how"]): Promise<ResolutionSummary> {
  return prisma.$transaction(async (tx) => {
    const vote = await tx.vote.findUniqueOrThrow({ where: { id: voteId }, include: { team: { include: { challenge: { include: { story: true } } } } } });
    const choice = await tx.storyChoice.findUniqueOrThrow({ where: { id: choiceId }, include: { target: true } });
    const chosen = targetTeamId ? await tx.team.findUniqueOrThrow({ where: { id: targetTeamId } }) : null;
    const others = await tx.team.findMany({ where: { challengeId: vote.team.challengeId, id: { not: vote.teamId } } });
    const names = { self: vote.team.name, chosen: chosen?.name };
    const summaries: string[] = [];
    const affected = new Set<string>();

    const targets = (t: "self" | "chosen" | "others") =>
      t === "self" ? [vote.team] : t === "chosen" ? (chosen ? [chosen] : []) : others;

    for (const e of parseEffects(choice.effects) as Effect[]) {
      summaries.push(describeEffect(e, names));
      if (e.type === "steal" || e.type === "alliance") {
        if (chosen) affected.add(chosen.id);
      } else if ("target" in e) {
        for (const t of targets(e.target)) if (t.id !== vote.teamId) affected.add(t.id);
      }
      switch (e.type) {
        case "points":
          for (const t of targets(e.target)) {
            await awardPoints(tx, { teamId: t.id, source: "STORY", baseAmount: e.amount, rawAmount: e.amount, label: `Histoire : ${choice.label}`, refId: `vote:${voteId}` });
          }
          break;
        case "steal":
          if (chosen) {
            await awardPoints(tx, { teamId: chosen.id, source: "STORY", baseAmount: -e.amount, rawAmount: -e.amount, label: `Histoire : ${vote.team.name} vous vole des points`, refId: `vote:${voteId}` });
            await awardPoints(tx, { teamId: vote.teamId, source: "STORY", baseAmount: e.amount, rawAmount: e.amount, label: `Histoire : points volés à ${chosen.name}`, refId: `vote:${voteId}` });
          }
          break;
        case "modifier":
          for (const t of targets(e.target)) {
            await tx.modifier.create({
              data: { teamId: t.id, multiplier: e.multiplier, label: e.label ?? `Histoire : ${choice.label}`, startAt: new Date(), endAt: new Date(Date.now() + e.days * 86400_000) },
            });
          }
          break;
        case "quest":
          for (const t of targets(e.target)) {
            await tx.quest.create({
              data: {
                challengeId: vote.team.challengeId,
                title: e.title,
                description: e.description,
                number: ((await tx.quest.aggregate({ where: { challengeId: vote.team.challengeId }, _max: { number: true } }))._max.number ?? 0) + 1,
                points: e.points,
                targetTeamId: t.id,
                origin: "STORY",
                closeAt: e.days ? new Date(Date.now() + e.days * 86400_000) : null,
              },
            });
          }
          break;
        case "alliance":
          if (chosen) {
            const [a, b] = [vote.teamId, chosen.id].sort();
            await tx.alliance.upsert({ where: { teamAId_teamBId: { teamAId: a, teamBId: b } }, create: { teamAId: a, teamBId: b }, update: {} });
          }
          break;
      }
    }

    await tx.vote.update({ where: { id: voteId }, data: { status: "RESOLVED", resultChoiceId: choiceId, targetTeamId, resolvedAt: new Date(), pendingChoiceId: null, pendingById: null } });
    if (choice.targetNodeId) {
      await tx.teamStoryState.update({ where: { teamId: vote.teamId }, data: { currentNodeId: choice.targetNodeId } });
      await tx.storyVisit.create({ data: { teamId: vote.teamId, nodeId: choice.targetNodeId, choiceLabel: choice.label } });
    }
    return { teamId: vote.teamId, teamName: vote.team.name, choiceLabel: choice.label, nextTitle: choice.target?.title ?? null, effects: summaries, awaitingTarget: false, how, affectedTeamIds: [...affected] };
  });
}

/** Cron / resolve-on-read: settle every expired vote and open the next ones. */
export async function resolveExpiredVotes(now = new Date()) {
  const expired = await prisma.vote.findMany({ where: { status: "OPEN", deadline: { lte: now } }, select: { id: true, teamId: true } });
  const results: ResolutionSummary[] = [];
  for (const v of expired) {
    const r = await tryResolveVote(v.id, now);
    if (r) results.push(r);
    await ensureTeamStory(v.teamId);
  }
  return results;
}

/** Teams whose chapter has been stuck (no open vote) for more than `days` days. */
export async function dormantTeams(days = 7, now = new Date()) {
  const states = await prisma.teamStoryState.findMany({
    where: { updatedAt: { lte: new Date(now.getTime() - days * 86_400_000) } },
    include: { currentNode: { select: { id: true, title: true, choices: { select: { id: true } } } }, team: { select: { id: true, name: true, discordChannelId: true } } },
  });
  const out: { teamId: string; nodeId: string; title: string; channelId: string | null; reason: string }[] = [];
  for (const s of states) {
    if (s.currentNode.choices.length === 0) continue;
    const vote = await prisma.vote.findFirst({ where: { teamId: s.teamId, status: { not: "RESOLVED" } } });
    if (vote?.status === "OPEN" && vote.tieStage === "NONE") continue;
    const status = await getTeamChapterStatus(s.teamId);
    const reason = vote?.status === "AWAITING_TARGET" ? "le·la capitaine doit désigner l'équipe visée" : vote?.status === "OPEN" ? "une égalité attend d'être tranchée" : status?.unmet.length ? `pour continuer : ${status.unmet.join(" ; ")}` : "";
    out.push({ teamId: s.teamId, nodeId: s.currentNodeId, title: s.currentNode.title, channelId: s.team.discordChannelId, reason });
  }
  return out;
}

/** Open votes stuck on a tie, with the cascade stage reached now (for reminders). */
export async function tiedVotes(now = new Date()) {
  const votes = await prisma.vote.findMany({ where: { status: "OPEN", tieStage: { not: "NONE" }, tieSince: { not: null } }, include: { team: true } });
  return votes.map((v) => ({ id: v.id, teamId: v.teamId, teamName: v.team.name, channelId: v.team.discordChannelId, stage: tieCascadeStage(v.tieSince!, now), recorded: v.tieStage, pending: !!v.pendingChoiceId }));
}

/** Persists the cascade stage reached (so reminders are posted once per stage). Returns votes that moved. */
export async function advanceTieStages(now = new Date()) {
  const moved: Awaited<ReturnType<typeof tiedVotes>> = [];
  for (const v of await tiedVotes(now)) {
    if (v.stage !== v.recorded) {
      await prisma.vote.update({ where: { id: v.id }, data: { tieStage: v.stage } });
      moved.push(v);
    }
  }
  return moved;
}
