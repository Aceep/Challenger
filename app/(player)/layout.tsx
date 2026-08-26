import { BottomNav } from "@/components/BottomNav";
import { requireUser } from "@/lib/dal";

export default async function PlayerLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
