import { HelpView } from "@/app/(player)/help/HelpView";
import { demoAction } from "@/lib/demo/actions";
import { DEMO_CURRENT_EDITION, DEMO_EDITION_OPTIONS } from "@/lib/demo/data";
import { helpSections } from "@/lib/discord/help";

export default async function DemoHelpPage({ searchParams }: PageProps<"/demo/help">) {
  return (
    <HelpView
      sections={helpSections({ library: "le salon librairie de ton équipe", adventure: "le salon aventure de ton équipe" })}
      edition={{ current: DEMO_CURRENT_EDITION, options: DEMO_EDITION_OPTIONS, action: demoAction.bind(null, "/demo/help") }}
      params={await searchParams}
      demo
    />
  );
}
