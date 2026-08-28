import { BottomNav } from "@/components/BottomNav";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { KyleGuide } from "@/components/tour/KyleGuide";

export default function DemoPlayerLayout({ children }: LayoutProps<"/demo">) {
  return (
    <div className="player-shell mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <DemoBanner tour="player" />
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav base="/demo" isAdmin />
      <KyleGuide base="/demo" />
    </div>
  );
}
