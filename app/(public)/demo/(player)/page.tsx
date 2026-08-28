import { HomeView } from "@/app/(player)/home/HomeView";
import { DEMO_HOME } from "@/lib/demo/data";

export default function DemoHomePage() {
  return <HomeView {...DEMO_HOME} demo />;
}
