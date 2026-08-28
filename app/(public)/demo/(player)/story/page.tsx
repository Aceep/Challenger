import { StoryView } from "@/app/(player)/story/StoryView";
import { DEMO_STORY, DEMO_TEAM } from "@/lib/demo/data";
import { demoAction } from "@/lib/demo/actions";

export default async function DemoStoryPage({ searchParams }: PageProps<"/demo/story">) {
  const action = demoAction.bind(null, "/demo/story");
  return (
    <StoryView
      {...DEMO_STORY}
      teamName={DEMO_TEAM.name}
      teamColor={DEMO_TEAM.color}
      isCaptain={false}
      isAdmin={false}
      params={await searchParams}
      demo
      voteAction={action}
      chooseTargetAction={action}
      breakTieAction={action}
      confirmTieAction={action}
    />
  );
}
