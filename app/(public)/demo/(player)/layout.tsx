import type { CSSProperties } from "react";
import { BottomNav } from "@/components/BottomNav";
import { EditionBar } from "@/components/EditionBar";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { KyleGuide } from "@/components/tour/KyleGuide";
import { DEMO_CHALLENGE } from "@/lib/demo/data";

export default function DemoPlayerLayout({ children }: LayoutProps<"/demo">) {
  return (
    <div className="player-shell mx-auto flex min-h-dvh w-full max-w-lg flex-col" style={{ "--edition": DEMO_CHALLENGE.color } as CSSProperties}>
      <DemoBanner tour="player" />
      <div className="flex flex-1 flex-col">
        <EditionBar name={DEMO_CHALLENGE.name} color={DEMO_CHALLENGE.color} href="/demo/help#edition" />
        {children}
      </div>
      <BottomNav base="/demo" isAdmin edition={{ name: DEMO_CHALLENGE.name, canSwitch: true }} />
      <KyleGuide base="/demo" />
    </div>
  );
}
