import { FaqAdminView } from "@/app/admin/faq/FaqAdminView";
import { DEMO_FAQ_SETUP, DEMO_QUESTIONS } from "@/lib/demo/data";
import { demoAction } from "@/lib/demo/actions";

export default async function DemoAdminFaqPage({ searchParams }: PageProps<"/demo/admin/faq">) {
  const params = await searchParams;
  const action = demoAction.bind(null, "/demo/admin/faq");

  return (
    <FaqAdminView
      forum={DEMO_FAQ_SETUP}
      questions={DEMO_QUESTIONS.map((q) => ({
        id: q.id,
        title: q.title,
        status: q.status,
        pinned: q.pinned,
        author: q.author,
        createdAt: q.createdAt,
        messages: q.messages,
        discordUrl: q.discordUrl,
      }))}
      hasChallenge
      params={params}
      demo
      setupAction={action}
      syncAction={action}
      resolveAction={action}
      pinAction={action}
    />
  );
}
