import { QuestsView } from "@/app/(player)/quests/QuestsView";
import { DEMO_QUESTS, DEMO_TEAM } from "@/lib/demo/data";

export default function DemoQuestsPage() {
  return <QuestsView quests={DEMO_QUESTS} hasChallenge hasTeam teamColor={DEMO_TEAM.color} demo />;
}
