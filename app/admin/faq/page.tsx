import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { getFaqSetup, listQuestions } from "@/lib/services/questions";
import { FaqAdminView } from "./FaqAdminView";
import { deleteQuestionAction, pinQuestionAction, resolveQuestionAction, setupFaqAction, syncFaqAction } from "./actions";

const EMPTY = { guildId: null, channelId: null, roleId: null, tags: null, channelUrl: null, adminsWithDiscord: 0, lastSyncAt: null, inviteUrl: null };
const actions = { setupAction: setupFaqAction, syncAction: syncFaqAction, resolveAction: resolveQuestionAction, pinAction: pinQuestionAction, deleteAction: deleteQuestionAction };

export default async function AdminFaqPage({ searchParams }: PageProps<"/admin/faq">) {
  await requireAdmin();
  const params = await searchParams;
  const challenge = await getActiveChallenge();
  if (!challenge) return <FaqAdminView forum={EMPTY} questions={[]} hasChallenge={false} params={params} {...actions} />;

  const [forum, questions] = await Promise.all([getFaqSetup(challenge.id), listQuestions(challenge.id)]);

  return (
    <FaqAdminView
      forum={forum}
      questions={questions.map((q) => ({
        id: q.id,
        title: q.title,
        status: q.status,
        pinned: q.pinned,
        author: q.author,
        createdAt: q.createdAt,
        messages: q.messages,
        discordUrl: q.discordUrl,
        discordDeleted: q.discordDeleted,
      }))}
      hasChallenge
      params={params}
      {...actions}
    />
  );
}
