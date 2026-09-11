import { getCurrentPlayer } from "@/lib/dal";
import { helpSections } from "@/lib/discord/help";
import { listOrganizedChallenges, listSwitchableChallenges } from "@/lib/services/membership";
import { getPushSettings } from "@/lib/services/push";
import { switchChallengeAction } from "./actions";
import { HelpView } from "./HelpView";

export default async function HelpPage({ searchParams }: PageProps<"/help">) {
  const { user, challenge, role } = await getCurrentPlayer();
  const [switchable, push, organized] = await Promise.all([
    listSwitchableChallenges(user.id),
    getPushSettings(user.id),
    // The ORGANIZER switch is offered to whoever organises *any* edition: the
    // notifications it covers are not tied to the edition being looked at.
    listOrganizedChallenges(user.id),
  ]);
  const sections = helpSections({ library: "le salon librairie de ton équipe", adventure: "le salon aventure de ton équipe" });

  return (
    <HelpView
      sections={sections}
      edition={{
        current: challenge && role ? { id: challenge.id, name: challenge.name, color: challenge.color, role } : null,
        options: switchable.map((s) => ({ id: s.challenge.id, name: s.challenge.name, color: s.challenge.color, status: s.challenge.status, role: s.role })),
        action: switchChallengeAction,
      }}
      push={{ ...push, isOrganizer: organized.length > 0 }}
      params={await searchParams}
    />
  );
}
