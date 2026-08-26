"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/books", label: "Lectures", icon: "📚" },
  { href: "/bingo", label: "Bingo", icon: "🎯" },
  { href: "/leaderboard", label: "Classement", icon: "🏆" },
] as const;

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...ITEMS, { href: "/admin", label: "Admin", icon: "⚙️" } as const] : ITEMS;

  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              active ? "font-semibold text-indigo-600 dark:text-indigo-400" : "text-slate-500"
            }`}
          >
            <span className="text-xl" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
