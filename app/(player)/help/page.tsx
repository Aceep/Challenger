import { getCurrentPlayer } from "@/lib/dal";
import { helpSections } from "@/lib/discord/help";
import { HelpView } from "./HelpView";

export default async function HelpPage() {
  await getCurrentPlayer();
  const sections = helpSections({ library: "le salon librairie de ton équipe", adventure: "le salon aventure de ton équipe" });
  return <HelpView sections={sections} />;
}
