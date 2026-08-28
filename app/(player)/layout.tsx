import { after } from "next/server";
import type { CSSProperties } from "react";
import { BottomNav } from "@/components/BottomNav";
import { EditionBar } from "@/components/EditionBar";
import { KyleGuide } from "@/components/tour/KyleGuide";
import { getCurrentPlayer } from "@/lib/dal";
import { listSwitchableChallenges } from "@/lib/services/membership";
import { tickOnActivity } from "@/lib/services/tick";
import { markOnboardedAction } from "./home/actions";

export default async function PlayerLayout({ children }: LayoutProps<"/">) {
  const { user, challenge, role } = await getCurrentPlayer();
  after(() => tickOnActivity(challenge?.id));
  // Only useful to know whether there is anywhere to switch to.
  const canSwitch = challenge ? (await listSwitchableChallenges(user.id)).length > 1 : false;

  return (
    <div
      className="player-shell mx-auto flex min-h-dvh w-full max-w-lg flex-col"
      style={challenge ? ({ "--edition": challenge.color } as CSSProperties) : undefined}
    >
      <div className="flex flex-1 flex-col">
        {challenge && <EditionBar name={challenge.name} color={challenge.color} href={canSwitch ? "/help#edition" : undefined} />}
        {children}
      </div>
      <BottomNav isAdmin={role === "ORGANIZER"} edition={challenge ? { name: challenge.name, canSwitch } : undefined} />
      <KyleGuide base="" onFinish={markOnboardedAction} />
    </div>
  );
}
