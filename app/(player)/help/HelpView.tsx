import { Card, Kyle, PageTitle, SectionHeading } from "@/components/ui";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { HelpSection } from "@/lib/discord/help";

export type HelpViewProps = { sections: HelpSection[]; demo?: boolean };

/**
 * The help copy is shared with the Discord bot, where the emoji in the section
 * titles carry the tone. On screen the typography does that job, so they are
 * dropped here rather than in `lib/discord/help` — the wording is untouched.
 */
const DECORATION = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]\s?/gu;

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
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Kyle width={64} alt="Kyle, la mascotte" />
          <PageTitle className="min-w-0 flex-1">Aide &amp; règles</PageTitle>
        </div>
        <p className="meta lg accent">
          Toutes les règles du défi, et les mêmes réponses que <code>/help</code> sur Discord.
        </p>
      </div>

      {sections.map((s) => (
        <Card key={s.title} tier="flat" className="help-card">
          <h3>{s.title.replace(DECORATION, "").trim()}</h3>
          <ul>
            {s.lines.map((l, i) => (
              <li key={i}>
                <Rich text={l.replace(DECORATION, "")} />
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <section className="section">
        <SectionHeading>Thème</SectionHeading>
        <ThemeToggle />
        <p className="meta-xs">«&#8239;Auto&#8239;» suit le réglage de ton téléphone : clair «&#8239;Papier&#8239;» le jour, sombre «&#8239;Encre&#8239;» la nuit.</p>
      </section>
    </main>
  );
}
