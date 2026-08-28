import { after } from "next/server";
import { syncVoteMessage } from "@/lib/discord/events";
import { getCurrentPlayer } from "@/lib/dal";
import { getTeamStoryView } from "@/lib/services/story";
import { StoryView } from "./StoryView";
import { breakTieAction, chooseTargetAction, confirmTieAction, voteAction } from "./actions";

export default async function StoryPage({ searchParams }: PageProps<"/story">) {
  const params = await searchParams;
  const { user, team } = await getCurrentPlayer();
  const view = team ? await getTeamStoryView(team.id, user.id) : null;
  const actions = { voteAction, chooseTargetAction, breakTieAction, confirmTieAction };

  if (!team || !view) {
    return (
      <StoryView
        storyTitle={null}
        teamName={team?.name ?? null}
        teamColor={team?.color ?? "#2E4A7D"}
        node={null}
        unmet={[]}
        choices={[]}
        vote={null}
        rivals={[]}
        allies={[]}
        history={[]}
        isCaptain={false}
        isAdmin={user.role === "ADMIN"}
        params={params}
        {...actions}
      />
    );
  }

  const { node, vote, choices, unmet } = view;
  if (vote?.status === "OPEN") after(() => syncVoteMessage(vote.id));

  return (
    <StoryView
      storyTitle={view.story.title}
      teamName={team.name}
      teamColor={team.color}
      node={node}
      unmet={unmet}
      choices={choices}
      vote={
        vote
          ? {
              id: vote.id,
              status: vote.status,
              deadline: vote.deadline,
              myChoiceId: vote.myChoiceId,
              ballots: vote.ballots,
              resultChoice: vote.resultChoice,
              tie: vote.tie
                ? { stage: vote.tie.stage, leaders: [...vote.tie.leaders], canBreak: vote.tie.canBreak, pendingChoiceId: vote.tie.pendingChoiceId }
                : null,
            }
          : null
      }
      rivals={view.rivals}
      allies={view.allies}
      history={view.history.map((h) => ({ title: h.title, choiceLabel: h.choiceLabel }))}
      isCaptain={view.isCaptain}
      isAdmin={user.role === "ADMIN"}
      params={params}
      {...actions}
    />
  );
}
