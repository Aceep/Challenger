import { getCurrentPlayer } from "@/lib/dal";
import { helpSections } from "@/lib/discord/help";
import { listSwitchableChallenges } from "@/lib/services/membership";
import { switchChallengeAction } from "./actions";
import { HelpView } from "./HelpView";

export default async function HelpPage({ searchParams }: PageProps<"/help">) {
  const { user, challenge, role } = await getCurrentPlayer();
  const switchable = await listSwitchableChallenges(user.id);
  const sections = helpSections({ library: "le salon librairie de ton équipe", adventure: "le salon aventure de ton équipe" });

  return (
    <HelpView
      sections={sections}
      edition={{
        current: challenge && role ? { id: challenge.id, name: challenge.name, color: challenge.color, role } : null,
        options: switchable.map((s) => ({ id: s.challenge.id, name: s.challenge.name, color: s.challenge.color, status: s.challenge.status, role: s.role })),
        action: switchChallengeAction,
      }}
      params={await searchParams}
    />
  );
}
