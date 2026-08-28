"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ITEMS = [
  { href: "/home", label: "Accueil", icon: "🏠" },
  { href: "/books", label: "Lectures", icon: "📚" },
  { href: "/bingo", label: "Bingo", icon: "🎯" },
  { href: "/quests", label: "Quêtes", icon: "🗺️" },
  { href: "/story", label: "Histoire", icon: "📖" },
] as const;

const MORE = [
  { href: "/leaderboard", label: "Classement", icon: "🏆" },
  { href: "/team", label: "Mon équipe", icon: "🎽" },
  { href: "/faq", label: "FAQ", icon: "❓" },
  { href: "/help", label: "Règles", icon: "📖" },
] as const;

/** Five tabs plus a « Plus » menu (Classement, Équipe, Aide, Administration). */
export function BottomNav({ base = "", isAdmin = false }: { base?: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const more = [...MORE.map((m) => ({ ...m, href: `${base}${m.href}` })), ...(isAdmin ? [{ href: base ? `${base}/admin` : "/admin", label: "Administration", icon: "⚙️" }] : [])];
  const moreActive = more.some((m) => pathname.startsWith(m.href));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/30" onClick={() => setOpen(false)} aria-hidden>
          <div className="mx-auto w-full max-w-lg px-3" style={{ position: "absolute", left: 0, right: 0, bottom: 86 }}>
            <div className="sheet" role="menu" onClick={(e) => e.stopPropagation()}>
              {more.map((m) => (
                <Link key={m.href} href={m.href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-2 py-2.5 font-bold" aria-current={pathname.startsWith(m.href) ? "page" : undefined}>
                  <span aria-hidden className="text-xl">
                    {m.icon}
                  </span>
                  {m.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav className="bottomnav sticky bottom-0 z-30" aria-label="Navigation">
        {ITEMS.map((item) => {
          // The demo's home screen is /demo itself, not /demo/home.
          const href = item.href === "/home" ? base || "/home" : `${base}${item.href}`;
          const active = item.href === "/home" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={item.href} href={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
              <span className="ic" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
        {more.map((m) => (
          <Link key={m.href} href={m.href} className="more-inline" aria-current={pathname.startsWith(m.href) ? "page" : undefined}>
            <span className="ic" aria-hidden>
              {m.icon}
            </span>
            {m.label}
          </Link>
        ))}
        <button type="button" className="more-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-current={moreActive && !open ? "page" : undefined}>
          <span className="ic" aria-hidden>
            {open ? "✕" : "☰"}
          </span>
          Plus
        </button>
      </nav>
    </>
  );
}
