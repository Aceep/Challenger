import { HelpView } from "@/app/(player)/help/HelpView";
import { helpSections } from "@/lib/discord/help";

export default function DemoHelpPage() {
  return <HelpView sections={helpSections({ library: "le salon librairie de ton équipe", adventure: "le salon aventure de ton équipe" })} demo />;
}
