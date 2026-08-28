import { ChallengeView } from "@/app/admin/challenge/ChallengeView";
import { DEMO_CHALLENGE_FORM, DEMO_EDITIONS } from "@/lib/demo/data";
import { demoStateAction } from "@/lib/demo/actions";

export default function DemoAdminChallengePage() {
  return <ChallengeView challenge={DEMO_CHALLENGE_FORM} editions={DEMO_EDITIONS} saveChallengeAction={demoStateAction} demo />;
}
