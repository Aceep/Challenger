"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/home", label: "Accueil", icon: "🏠" },
  { href: "/books", label: "Lectures", icon: "📚" },
  { href: "/bingo", label: "Bingo", icon: "🎯" },
  { href: "/quests", label: "Quêtes", icon: "🗺️" },
  { href: "/story", label: "Histoire", icon: "📖" },
] as const;

/** Five tabs, as in the mockup: Classement, Équipe, Aide and Admin live on the home screen. */
export function BottomNav({ base = "" }: { base?: string }) {
  const pathname = usePathname();
  return (
    <nav className="bottomnav sticky bottom-0 z-10" aria-label="Navigation">
      {ITEMS.map((item) => {
        // The demo's home screen is /demo itself, not /demo/home.
        const href = item.href === "/home" ? base || "/home" : `${base}${item.href}`;
        const active = item.href === "/home" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={item.href} href={href} aria-current={active ? "page" : undefined}>
            <span className="ic" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
