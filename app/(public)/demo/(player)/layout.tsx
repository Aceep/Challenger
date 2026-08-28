import { BottomNav } from "@/components/BottomNav";
import { DemoBanner } from "@/components/demo/DemoBanner";

export default function DemoPlayerLayout({ children }: LayoutProps<"/demo">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <DemoBanner />
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav base="/demo" />
    </div>
  );
}
