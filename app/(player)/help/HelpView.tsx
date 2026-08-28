import { Card, Kyle, PageTitle, SectionHeading } from "@/components/ui";
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
export function HelpView({ sections }: HelpViewProps) {
  return (
    <main className="help flex flex-1 flex-col gap-6 p-5">
      <div className="flex items-center gap-4">
        <Kyle width={64} alt="Kyle, la mascotte" />
        <PageTitle
          className="min-w-0 flex-1"
          kicker={
            <p className="accent text-[15px] text-[color:var(--muted)]">
              Aussi disponible avec <code>/help</code> sur Discord.
            </p>
          }
        >
          Aide &amp; règles
        </PageTitle>
      </div>

      {sections.map((s) => (
        <Card key={s.title} tier="flat" className="help-card">
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

      <section className="section">
        <SectionHeading>Thème</SectionHeading>
        <ThemeToggle />
        <p className="meta-xs">« Auto » suit le réglage de ton téléphone : clair « Papier » le jour, sombre « Encre » la nuit.</p>
      </section>
    </main>
  );
}
