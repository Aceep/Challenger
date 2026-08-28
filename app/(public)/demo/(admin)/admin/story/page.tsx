import { StoryAdminView } from "@/app/admin/story/StoryAdminView";
import { DEMO_ADMIN_STORY, DEMO_ADMIN_STORY_TEAMS } from "@/lib/demo/data";
import { demoAction, demoStateAction } from "@/lib/demo/actions";

export default async function DemoAdminStoryPage({ searchParams }: PageProps<"/demo/admin/story">) {
  const action = demoAction.bind(null, "/demo/admin/story");
  return (
    <StoryAdminView
      story={DEMO_ADMIN_STORY}
      quests={[{ id: "demo-quest-2", title: "Un classique du XIXᵉ" }]}
      teams={DEMO_ADMIN_STORY_TEAMS}
      hasChallenge
      params={await searchParams}
      demo
      actions={{
        saveStoryAction: demoStateAction,
        saveNodeAction: demoStateAction,
        saveChoiceAction: demoStateAction,
        deleteNodeAction: action,
        deleteChoiceAction: action,
        setStartNodeAction: action,
      }}
      resetTeamStoryAction={action}
    />
  );
}
