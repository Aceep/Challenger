"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kyle } from "@/components/ui/Kyle";

const GROUPS = [
  { group: null, items: [{ href: "/admin", label: "📊 Tableau de bord" }] },
  {
    group: "Édition",
    items: [
      { href: "/admin/challenge", label: "🗓️ Défi" },
      { href: "/admin/teams", label: "🎽 Équipes" },
      { href: "/admin/players", label: "👥 Joueurs" },
    ],
  },
  {
    group: "Contenu",
    items: [
      { href: "/admin/readings", label: "📚 Lectures" },
      { href: "/admin/bingo", label: "🎯 Bingo" },
      { href: "/admin/quests", label: "🗺️ Quêtes" },
      { href: "/admin/story", label: "📖 Histoire" },
      { href: "/admin/faq", label: "❓ FAQ" },
    ],
  },
] as const;

/** Left rail of the admin desk. `base` is "/demo" for the read-only demo. */
export function AdminRail({ who, base = "", openQuestions = 0 }: { who: string; base?: string; /** Badge on FAQ: questions without an answer yet. */ openQuestions?: number }) {
  const pathname = usePathname();
  return (
    <nav className="rail" aria-label="Administration">
      <Link href={base || "/home"} className="back" aria-label="Retour à la vue joueur">
        ← Vue joueur
      </Link>
      <div className="flex items-center gap-2 px-2 pt-1.5 pb-4 font-display text-[17px] font-black">
        <Kyle width={28} />
        Aceep&amp;Kyle
      </div>
      {GROUPS.map((g, i) => (
        <div key={i} className="contents">
          {g.group && <p className="group">{g.group}</p>}
          {g.items.map((item) => {
            const href = `${base}${item.href}`;
            const active = item.href === "/admin" ? pathname === href : pathname.startsWith(href);
            const badge = item.href === "/admin/faq" && openQuestions > 0 ? openQuestions : null;
            return (
              <Link key={item.href} href={href} aria-current={active ? "page" : undefined}>
                {item.label}
                {badge !== null && (
                  <span className="badge" title={`${badge} question${badge > 1 ? "s" : ""} sans réponse`}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      <p className="foot">{who}</p>
    </nav>
  );
}
