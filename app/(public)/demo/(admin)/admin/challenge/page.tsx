import { ChallengeView } from "@/app/admin/challenge/ChallengeView";
import { DEMO_CHALLENGE_FORM, DEMO_DISCORD_SETUP, DEMO_EDITIONS, DEMO_NEXT_STEPS } from "@/lib/demo/data";
import { demoAction, demoStateAction } from "@/lib/demo/actions";

export default async function DemoAdminChallengePage({ searchParams }: PageProps<"/demo/admin/challenge">) {
  const params = await searchParams;
  return (
    <ChallengeView
      challenge={DEMO_CHALLENGE_FORM}
      editions={DEMO_EDITIONS}
      steps={DEMO_NEXT_STEPS}
      discord={DEMO_DISCORD_SETUP}
      params={params}
      saveChallengeAction={demoStateAction}
      setupDiscordAction={demoAction.bind(null, "/demo/admin/challenge")}
      switchAction={demoAction.bind(null, "/demo/admin/challenge")}
      demo
    />
  );
}
