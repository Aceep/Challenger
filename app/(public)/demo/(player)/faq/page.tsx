import { FaqListView } from "@/app/(player)/faq/FaqListView";
import { DEMO_QUESTIONS } from "@/lib/demo/data";
import { demoAction } from "@/lib/demo/actions";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function DemoFaqPage({ searchParams }: PageProps<"/demo/faq">) {
  const params = await searchParams;
  return (
    <FaqListView
      questions={DEMO_QUESTIONS}
      hasChallenge
      forumConfigured
      creating={one(params.new) === "1"}
      params={params}
      demo
      askQuestionAction={demoAction.bind(null, "/demo/faq")}
    />
  );
}
