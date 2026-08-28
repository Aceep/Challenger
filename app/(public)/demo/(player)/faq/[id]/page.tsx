import { notFound } from "next/navigation";
import { QuestionView } from "@/app/(player)/faq/QuestionView";
import { DEMO_QUESTION_THREADS } from "@/lib/demo/data";
import { demoAction } from "@/lib/demo/actions";

export default async function DemoQuestionPage({ params, searchParams }: PageProps<"/demo/faq/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const question = DEMO_QUESTION_THREADS.find((q) => q.id === id);
  if (!question) notFound();
  const action = demoAction.bind(null, `/demo/faq/${id}`);

  return <QuestionView question={question} params={sp} demo replyAction={action} resolveAction={action} pinAction={action} />;
}
