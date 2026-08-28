import { TeamView } from "@/app/(player)/team/TeamView";
import { DEMO_TEAM_VIEW } from "@/lib/demo/data";

export default async function DemoTeamPage({ searchParams }: PageProps<"/demo/team">) {
  return <TeamView {...DEMO_TEAM_VIEW} params={await searchParams} demo />;
}
