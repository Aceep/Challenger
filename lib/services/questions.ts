import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { GameError } from "@/lib/errors";
import {
  botInviteUrl,
  channelUrl,
  FAQ_CHANNEL_NAME,
  FAQ_ROLE_NAME,
  FAQ_TAG_NAMES,
  mapDiscordMessages,
  nextStatus,
  parseFaqTags,
  pinnedContent,
  questionPostContent,
  replyContent,
  resolvedContent,
  tagsFor,
  threadUrl,
  type FaqTags,
  type QuestionStatus,
} from "@/lib/discord/faq";
import { addMemberRole, createForumChannel, createForumPost, createRole, listMessages, patchThread, postMessage } from "@/lib/discord/rest";
import { assertWritable } from "@/lib/scoring/books";

/**
 * FAQ questions. One implementation shared by the web Server Actions and the
 * `/question` slash command: every write pushes to the Discord forum thread
 * immediately, while replies typed inside Discord are pulled back by
 * `syncQuestions` (incremental REST poll, throttled to one run per minute).
 */

const SYNC_THROTTLE_MS = 60_000;

export const askSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit faire au moins 3 caractères").max(100, "Le titre ne peut pas dépasser 100 caractères"),
  detail: z
    .string()
    .trim()
    .max(1000, "Le détail ne peut pas dépasser 1000 caractères")
    .optional()
    .transform((s) => s ?? ""),
});
export type AskInput = z.infer<typeof askSchema>;

export const replySchema = z.object({
  body: z.string().trim().min(1, "Écris ta réponse").max(1000, "La réponse ne peut pas dépasser 1000 caractères"),
});

const botAppId = () => process.env.AUTH_DISCORD_ID ?? null;

async function actorOf(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, discordId: true } });
  if (!user) throw new GameError("Utilisateur inconnu.");
  return user;
}

async function challengeOf(challengeId: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new GameError("Aucun défi actif.");
  return challenge;
}

async function activeChallenge() {
  const challenge = await prisma.challenge.findFirst({ where: { status: "ACTIVE" }, orderBy: { startAt: "desc" } });
  if (!challenge) throw new GameError("Aucun défi actif : impossible de poser une question.");
  return challenge;
}

const displayName = (u: { name: string | null }) => u.name ?? "Quelqu'un";

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

/** Pinned first, then the live questions, then the resolved ones (newest first). */
const rank = (q: { pinned: boolean; status: QuestionStatus }) => (q.pinned ? 0 : q.status === "RESOLVED" ? 2 : 1);

export async function listQuestions(challengeId: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  const rows = await prisma.question.findMany({
    where: { challengeId },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
      messages: { where: { isAdmin: true }, orderBy: { createdAt: "desc" }, take: 1, include: { author: { select: { name: true } } } },
    },
  });
  return rows
    .map((q) => {
      const answer = q.messages[0];
      return {
        id: q.id,
        title: q.title,
        body: q.body,
        status: q.status as QuestionStatus,
        pinned: q.pinned,
        authorId: q.authorId,
        author: displayName(q.author),
        createdAt: q.createdAt,
        messages: q._count.messages,
        lastAnswer: answer ? { author: answer.author?.name ?? answer.discordUserName ?? "Organisation", body: answer.body } : null,
        discordUrl: threadUrl(challenge?.discordGuildId, q.discordThreadId),
      };
    })
    .sort((a, b) => rank(a) - rank(b) || b.createdAt.getTime() - a.createdAt.getTime());
}

export type QuestionRow = Awaited<ReturnType<typeof listQuestions>>[number];

/** One question with its thread and what the viewer may do with it. */
export async function getQuestion(id: string, viewer: { id: string; role: "ADMIN" | "PLAYER" }) {
  const q = await prisma.question.findUnique({
    where: { id },
    include: {
      challenge: { select: { discordGuildId: true } },
      author: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!q) return null;
  const isAdmin = viewer.role === "ADMIN";
  return {
    id: q.id,
    title: q.title,
    body: q.body,
    status: q.status as QuestionStatus,
    pinned: q.pinned,
    author: displayName(q.author),
    isMine: q.authorId === viewer.id,
    createdAt: q.createdAt,
    discordUrl: threadUrl(q.challenge.discordGuildId, q.discordThreadId),
    messages: q.messages.map((m) => ({
      id: m.id,
      author: m.author?.name ?? m.discordUserName ?? "Discord",
      isAdmin: m.isAdmin,
      fromDiscord: !!m.discordMessageId,
      body: m.body,
      createdAt: m.createdAt,
    })),
    canReply: q.status !== "RESOLVED",
    canResolve: q.status !== "RESOLVED" && (isAdmin || q.authorId === viewer.id),
    canPin: isAdmin,
  };
}

export type QuestionDetail = NonNullable<Awaited<ReturnType<typeof getQuestion>>>;

/** Questions still waiting for a first answer — badge of the admin rail. */
export function openQuestionsCount(challengeId: string) {
  return prisma.question.count({ where: { challengeId, status: "OPEN" } });
}

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

/** Creates the question and opens its forum thread (site-only when no forum yet). */
export async function askQuestion({ userId, title, detail }: { userId: string; title: string; detail?: string }) {
  const user = await actorOf(userId);
  assertWritable(user.role);
  const input = askSchema.parse({ title, detail });
  const challenge = await activeChallenge();

  const question = await prisma.question.create({ data: { challengeId: challenge.id, authorId: user.id, title: input.title, body: input.detail } });

  let url: string | null = null;
  if (challenge.discordFaqChannelId) {
    const post = await createForumPost(challenge.discordFaqChannelId, {
      name: input.title,
      content: questionPostContent({ authorDiscordId: user.discordId, roleId: challenge.discordAdminRoleId, body: input.detail || input.title }),
      appliedTags: tagsFor("OPEN", parseFaqTags(challenge.discordFaqTags)),
      allowedMentions: challenge.discordAdminRoleId ? { roles: [challenge.discordAdminRoleId] } : undefined,
    });
    if (post) {
      await prisma.question.update({ where: { id: question.id }, data: { discordThreadId: post.threadId, lastDiscordMessageId: post.messageId } });
      url = threadUrl(challenge.discordGuildId, post.threadId);
    }
  }
  return { id: question.id, title: question.title, threadUrl: url, forumConfigured: !!challenge.discordFaqChannelId };
}

/** Adds a reply on both sides and moves the status when the organisation answers. */
export async function replyToQuestion({ userId, questionId, body }: { userId: string; questionId: string; body: string }) {
  const user = await actorOf(userId);
  assertWritable(user.role);
  const text = replySchema.parse({ body }).body;
  const question = await prisma.question.findUnique({ where: { id: questionId }, include: { challenge: true, author: { select: { id: true, name: true, discordId: true } } } });
  if (!question) throw new GameError("Question introuvable.");
  if (question.status === "RESOLVED") throw new GameError("Cette question est résolue : rouvre un nouveau sujet si besoin.");

  const isAdmin = user.role === "ADMIN";
  await prisma.questionMessage.create({
    data: { questionId: question.id, authorId: user.id, discordUserId: user.discordId, discordUserName: user.name, body: text, isAdmin },
  });

  const status = nextStatus(question.status as QuestionStatus, { adminReplied: isAdmin });
  const tags = parseFaqTags(question.challenge.discordFaqTags);

  if (question.discordThreadId) {
    const mention = isAdmin && question.author.discordId && question.author.id !== user.id ? question.author.discordId : null;
    const messageId = await postMessage(question.discordThreadId, {
      content: replyContent({ name: displayName(user), isAdmin, mentionUserId: mention, body: text }),
      allowedMentions: mention ? { users: [mention] } : { users: [] },
    });
    // The bot's own message becomes the new poll cursor: it must never be re-imported.
    if (messageId) await prisma.question.update({ where: { id: question.id }, data: { lastDiscordMessageId: messageId } });
    if (status !== question.status) await patchThread(question.discordThreadId, { applied_tags: tagsFor(status, tags) });
  }
  if (status !== question.status) await prisma.question.update({ where: { id: question.id }, data: { status } });
  return { status, isAdmin };
}

/** Admin or author: closes the question and archives the thread. */
export async function resolveQuestion({ userId, questionId }: { userId: string; questionId: string }) {
  const user = await actorOf(userId);
  const question = await prisma.question.findUnique({ where: { id: questionId }, include: { challenge: true } });
  if (!question) throw new GameError("Question introuvable.");
  if (user.role !== "ADMIN" && question.authorId !== user.id) throw new GameError("Seul·e l'auteur·rice ou un·e admin peut clore la question.");
  if (question.status === "RESOLVED") return { alreadyResolved: true };
  assertWritable(user.role);

  await prisma.question.update({ where: { id: question.id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
  if (question.discordThreadId) {
    // Post before archiving: a locked thread refuses new messages.
    await postMessage(question.discordThreadId, { content: resolvedContent(displayName(user)) });
    await patchThread(question.discordThreadId, {
      applied_tags: tagsFor("RESOLVED", parseFaqTags(question.challenge.discordFaqTags)),
      archived: true,
      locked: true,
    });
  }
  return { alreadyResolved: false };
}

/** Admin only: highlights the question in the « Questions fréquentes » section. */
export async function pinQuestion({ userId, questionId, pinned }: { userId: string; questionId: string; pinned: boolean }) {
  const user = await actorOf(userId);
  if (user.role !== "ADMIN") throw new GameError("Réservé à l'organisation.");
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) throw new GameError("Question introuvable.");
  await prisma.question.update({ where: { id: question.id }, data: { pinned } });
  if (question.discordThreadId && question.pinned !== pinned) await postMessage(question.discordThreadId, { content: pinnedContent(pinned) });
  return { pinned };
}

// ---------------------------------------------------------------------------
// Sondage des fils Discord
// ---------------------------------------------------------------------------

/**
 * Pulls the replies typed directly in Discord. One REST call per live thread,
 * starting after the last message already imported. Throttled to once a minute
 * unless `force` (admin button), so it is safe to call on every page render.
 */
export async function syncQuestions(challengeId: string, { force = false }: { force?: boolean } = {}) {
  const empty = { threads: 0, imported: 0, skipped: true };
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge?.discordFaqChannelId) return empty;
  if (!force && challenge.faqSyncedAt && Date.now() - challenge.faqSyncedAt.getTime() < SYNC_THROTTLE_MS) return empty;
  // Marked before the calls: two concurrent renders must not both poll Discord.
  await prisma.challenge.update({ where: { id: challenge.id }, data: { faqSyncedAt: new Date() } });

  const [questions, users] = await Promise.all([
    prisma.question.findMany({ where: { challengeId, status: { not: "RESOLVED" }, discordThreadId: { not: null } } }),
    prisma.user.findMany({ where: { discordId: { not: null } }, select: { id: true, discordId: true, role: true } }),
  ]);
  const knownUsers = new Map(users.map((u) => [u.discordId!, { id: u.id, role: u.role }]));
  const tags = parseFaqTags(challenge.discordFaqTags);
  let imported = 0;

  for (const q of questions) {
    const raw = await listMessages(q.discordThreadId!, q.lastDiscordMessageId);
    const { messages, lastMessageId } = mapDiscordMessages(raw, { botAppId: botAppId(), knownUsers });
    if (messages.length) {
      const created = await prisma.questionMessage.createMany({
        data: messages.map((m) => ({
          questionId: q.id,
          authorId: m.authorId,
          discordUserId: m.discordUserId,
          discordUserName: m.discordUserName,
          discordMessageId: m.discordMessageId,
          body: m.body,
          isAdmin: m.isAdmin,
        })),
        skipDuplicates: true,
      });
      imported += created.count;
    }
    const status = nextStatus(q.status as QuestionStatus, { adminReplied: messages.some((m) => m.isAdmin) });
    if (lastMessageId || status !== q.status) {
      await prisma.question.update({ where: { id: q.id }, data: { lastDiscordMessageId: lastMessageId ?? q.lastDiscordMessageId, status } });
    }
    if (status !== q.status) await patchThread(q.discordThreadId!, { applied_tags: tagsFor(status, tags) });
  }
  return { threads: questions.length, imported, skipped: false };
}

// ---------------------------------------------------------------------------
// Installation du forum (admin)
// ---------------------------------------------------------------------------

export type FaqSetupResult = {
  channelId: string | null;
  roleId: string | null;
  tags: FaqTags | null;
  admins: number;
  adminsTotal: number;
  problems: string[];
};

/**
 * Creates the "faq" forum and the "Organisateurs" role, then gives that role to
 * every admin with a linked Discord account. Idempotent: whatever already exists
 * is kept. Permission failures are reported, never thrown.
 */
export async function setupFaq(challengeId: string): Promise<FaqSetupResult> {
  const challenge = await challengeOf(challengeId);
  if (!challenge.discordGuildId) throw new GameError("Renseigne d'abord l'identifiant du serveur Discord dans « Défi ».");
  const guildId = challenge.discordGuildId;
  const problems: string[] = [];

  let channelId = challenge.discordFaqChannelId;
  let tags = parseFaqTags(challenge.discordFaqTags);
  if (!channelId) {
    const forum = await createForumChannel(guildId, FAQ_CHANNEL_NAME, FAQ_TAG_NAMES.map((t) => ({ name: t.name, emoji: t.emoji })));
    if (!forum) {
      problems.push("le salon forum « faq » n'a pas pu être créé — le bot a-t-il la permission « Gérer les salons » ?");
    } else {
      channelId = forum.id;
      const byName = (name: string) => forum.tags.find((t) => t.name === name)?.id ?? "";
      tags = { open: byName("Ouverte"), answered: byName("Répondue"), resolved: byName("Résolue") };
      if (!tags.open || !tags.answered || !tags.resolved) {
        tags = null;
        problems.push("les étiquettes du forum n'ont pas été renvoyées par Discord : les statuts ne seront pas affichés dans le forum.");
      }
    }
  }

  let roleId = challenge.discordAdminRoleId;
  if (!roleId) {
    roleId = await createRole(guildId, FAQ_ROLE_NAME, Number.parseInt(challenge.color.replace("#", ""), 16) || 0);
    if (!roleId) problems.push("le rôle « Organisateurs » n'a pas pu être créé — le bot a-t-il la permission « Gérer les rôles » ?");
  }

  const admins = await prisma.user.findMany({ where: { role: "ADMIN", discordId: { not: null } }, select: { discordId: true } });
  let assigned = 0;
  if (roleId) {
    for (const a of admins) if (await addMemberRole(guildId, a.discordId!, roleId)) assigned++;
    if (assigned < admins.length) problems.push("le rôle n'a pas pu être donné à tou·tes les admins — le rôle du bot doit être au-dessus dans la liste des rôles.");
  }

  await prisma.challenge.update({
    where: { id: challenge.id },
    data: { discordFaqChannelId: channelId, discordAdminRoleId: roleId, ...(tags ? { discordFaqTags: tags } : {}) },
  });
  return { channelId, roleId, tags, admins: assigned, adminsTotal: admins.length, problems };
}

/** Everything the admin screen shows about the forum wiring. */
export async function getFaqSetup(challengeId: string) {
  const challenge = await challengeOf(challengeId);
  const admins = await prisma.user.count({ where: { role: "ADMIN", discordId: { not: null } } });
  return {
    guildId: challenge.discordGuildId,
    channelId: challenge.discordFaqChannelId,
    roleId: challenge.discordAdminRoleId,
    tags: parseFaqTags(challenge.discordFaqTags),
    channelUrl: channelUrl(challenge.discordGuildId, challenge.discordFaqChannelId),
    adminsWithDiscord: admins,
    lastSyncAt: challenge.faqSyncedAt,
    inviteUrl: botInviteUrl(botAppId()),
  };
}

export type FaqSetupView = Awaited<ReturnType<typeof getFaqSetup>>;
