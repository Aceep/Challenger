import { HomeView } from "@/app/(player)/home/HomeView";
import { DEMO_HOME } from "@/lib/demo/data";

export default async function DemoHomePage({ searchParams }: PageProps<"/demo">) {
  return <HomeView {...DEMO_HOME} params={await searchParams} demo />;
}
