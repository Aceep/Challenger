import { after } from "next/server";
import { BottomNav } from "@/components/BottomNav";
import { KyleGuide } from "@/components/tour/KyleGuide";
import { getCurrentPlayer } from "@/lib/dal";
import { tickOnActivity } from "@/lib/services/tick";
import { markOnboardedAction } from "./home/actions";

export default async function PlayerLayout({ children }: LayoutProps<"/">) {
  const { challenge, role } = await getCurrentPlayer();
  after(() => tickOnActivity(challenge?.id));
  return (
    <div className="player-shell mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav isAdmin={role === "ORGANIZER"} />
      <KyleGuide base="" onFinish={markOnboardedAction} />
    </div>
  );
}
