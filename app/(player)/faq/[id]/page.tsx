import { notFound } from "next/navigation";
import { getCurrentPlayer } from "@/lib/dal";
import { getQuestion } from "@/lib/services/questions";
import { QuestionView } from "../QuestionView";
import { deleteAction, pinAction, replyAction, resolveAction } from "../actions";

export default async function QuestionPage({ params, searchParams }: PageProps<"/faq/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { user } = await getCurrentPlayer();
  const question = await getQuestion(id, { id: user.id, role: user.role === "ADMIN" ? "ADMIN" : "PLAYER" });
  if (!question) notFound();

  return <QuestionView question={question} params={sp} replyAction={replyAction} resolveAction={resolveAction} pinAction={pinAction} deleteAction={deleteAction} />;
}
