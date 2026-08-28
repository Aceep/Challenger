import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/dal";
import { getQuestion } from "@/lib/services/questions";
import { QuestionView } from "../QuestionView";
import { deleteAction, pinAction, replyAction, resolveAction } from "../actions";

export default async function QuestionPage({ params, searchParams }: PageProps<"/faq/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { user, challenge, role } = await getCurrentPlayer();
  // A question of another challenge simply does not exist for this viewer.
  const question = await getQuestion(id, { id: user.id, challengeId: challenge?.id ?? null, role });
  if (!question) notFound();

  return <QuestionView question={question} params={sp} replyAction={replyAction} resolveAction={resolveAction} pinAction={pinAction} deleteAction={deleteAction} />;
}
