import Link from "next/link";
import { Card, Kyle } from "@/components/ui";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { HelpSection } from "@/lib/discord/help";

export type HelpViewProps = { sections: HelpSection[]; demo?: boolean };

/** Renders "**bold**" segments from the shared help lines. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part.replace(/\*([^*]+)\*/g, "$1")}</span>,
      )}
    </>
  );
}

/** Help & rules — pure view, reused by /demo. */
export function HelpView({ sections, demo }: HelpViewProps) {
  return (
    <main className="help flex flex-1 flex-col gap-4 p-5">
      <header className="flex items-center gap-3">
        <Kyle width={64} alt="Kyle, la mascotte" />
        <div>
          <Link href={demo ? "/demo" : "/home"} className="text-[13px] text-[color:var(--muted)]">
            ← Accueil
          </Link>
          <h1>Aide &amp; règles</h1>
          <p className="text-[13px] text-[color:var(--muted)]">
            Aussi disponible avec <code>/help</code> sur Discord.
          </p>
        </div>
      </header>

      {sections.map((s) => (
        <Card key={s.title} className="help-card">
          <h3>{s.title}</h3>
          <ul>
            {s.lines.map((l, i) => (
              <li key={i}>
                <Rich text={l} />
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <section className="flex flex-col gap-2">
        <p className="eyebrow">Thème</p>
        <ThemeToggle />
        <p className="text-xs text-[color:var(--muted)]">
          « Auto » suit le réglage de ton téléphone : clair « Papier » le jour, sombre « Encre » la nuit.
        </p>
      </section>
    </main>
  );
}
