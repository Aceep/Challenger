"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type SVGProps } from "react";
import {
  BingoIcon,
  BooksIcon,
  CloseIcon,
  FaqIcon,
  HelpIcon,
  HomeIcon,
  MenuIcon,
  QuestIcon,
  SettingsIcon,
  StoryIcon,
  SwapIcon,
  TeamIcon,
  TrophyIcon,
} from "@/components/ui/icons";

type Item = { href: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> };

const ITEMS: readonly Item[] = [
  { href: "/home", label: "Accueil", Icon: HomeIcon },
  { href: "/books", label: "Lectures", Icon: BooksIcon },
  { href: "/bingo", label: "Bingo", Icon: BingoIcon },
  { href: "/quests", label: "Quêtes", Icon: QuestIcon },
  { href: "/story", label: "Histoire", Icon: StoryIcon },
];

const MORE: readonly Item[] = [
  { href: "/leaderboard", label: "Classement", Icon: TrophyIcon },
  { href: "/team", label: "Mon équipe", Icon: TeamIcon },
  { href: "/faq", label: "FAQ", Icon: FaqIcon },
  { href: "/help", label: "Aide & règles", Icon: HelpIcon },
];

/** Five tabs plus a « Plus » menu (Classement, Équipe, Aide, Administration). */
export function BottomNav({
  base = "",
  isAdmin = false,
  edition,
}: {
  base?: string;
  isAdmin?: boolean;
  /** Current edition, spelled out on the first line of the « Plus » sheet. */
  edition?: { name: string; canSwitch: boolean };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const more: Item[] = [
    ...MORE.map((m) => ({ ...m, href: `${base}${m.href}` })),
    ...(isAdmin ? [{ href: base ? `${base}/admin` : "/admin", label: "Administration", Icon: SettingsIcon }] : []),
  ];
  const moreActive = more.some((m) => pathname.startsWith(m.href));
  const home = base || "/home";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/30" onClick={() => setOpen(false)} aria-hidden>
          <div className="mx-auto w-full max-w-lg px-3" style={{ position: "absolute", left: 0, right: 0, bottom: 86 }}>
            <div className="sheet" role="menu" onClick={(e) => e.stopPropagation()}>
              {edition &&
                (edition.canSwitch ? (
                  <Link href={`${base}/help#edition`} className="sheet-edition" onClick={() => setOpen(false)}>
                    <SwapIcon className="ico" />
                    <span>
                      Édition&#8239;: <strong>{edition.name}</strong>
                    </span>
                    <em>Changer</em>
                  </Link>
                ) : (
                  <p className="sheet-edition" aria-current="true">
                    <SwapIcon className="ico" />
                    <span>
                      Édition&#8239;: <strong>{edition.name}</strong>
                    </span>
                  </p>
                ))}
              {more.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-[var(--r-sm)] px-2 py-2.5 font-semibold"
                  aria-current={pathname.startsWith(href) ? "page" : undefined}
                >
                  <Icon className="ico" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav className="bottomnav sticky bottom-0 z-30" aria-label="Navigation">
        <Link href={home} className="brand" aria-hidden tabIndex={-1}>
          <Image src="/Kyle.png" alt="" width={28} height={34} sizes="28px" />
          Challenger
        </Link>
        {ITEMS.map(({ href: path, label, Icon }) => {
          // The demo's home screen is /demo itself, not /demo/home.
          const href = path === "/home" ? home : `${base}${path}`;
          const active = path === "/home" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={path} href={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
              <Icon />
              {label}
            </Link>
          );
        })}
        {more.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="more-inline" aria-current={pathname.startsWith(href) ? "page" : undefined}>
            <Icon />
            {label}
          </Link>
        ))}
        <button
          type="button"
          className="more-btn"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-current={moreActive && !open ? "page" : undefined}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
          Plus
        </button>
      </nav>
    </>
  );
}
