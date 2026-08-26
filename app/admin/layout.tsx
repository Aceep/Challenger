import Link from "next/link";
import { requireAdmin } from "@/lib/dal";

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/challenge", label: "Défi" },
  { href: "/admin/teams", label: "Équipes" },
  { href: "/admin/players", label: "Joueurs & invitations" },
  { href: "/admin/bingo", label: "Bingo" },
  { href: "/admin/quests", label: "Quêtes" },
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 p-4 dark:border-slate-800">
        <Link href="/" className="font-bold">
          ← Book Challenge
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="underline-offset-4 hover:underline">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </div>
  );
}
