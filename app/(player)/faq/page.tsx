import { after } from "next/server";
import { getActiveChallenge, getCurrentPlayer } from "@/lib/dal";
import { listQuestions, syncQuestions } from "@/lib/services/questions";
import { FaqListView } from "./FaqListView";
import { askQuestionAction } from "./actions";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function FaqPage({ searchParams }: PageProps<"/faq">) {
  const params = await searchParams;
  const { team } = await getCurrentPlayer();
  const challenge = team?.challenge ?? (await getActiveChallenge());
  if (!challenge) {
    return (
      <FaqListView questions={[]} hasChallenge={false} forumConfigured={false} creating={false} params={params} askQuestionAction={askQuestionAction} />
    );
  }

  const questions = await listQuestions(challenge.id);
  // Replies typed inside Discord are pulled after the render (throttled service-side).
  after(() => syncQuestions(challenge.id));

  return (
    <FaqListView
      questions={questions}
      hasChallenge
      forumConfigured={!!challenge.discordFaqChannelId}
      creating={one(params.new) === "1"}
      params={params}
      askQuestionAction={askQuestionAction}
    />
  );
}
