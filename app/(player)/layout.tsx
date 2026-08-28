import { after } from "next/server";
import { BottomNav } from "@/components/BottomNav";
import { requireUser } from "@/lib/dal";
import { tickOnActivity } from "@/lib/services/tick";

export default async function PlayerLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  after(() => tickOnActivity());
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
