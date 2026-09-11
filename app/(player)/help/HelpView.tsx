import Link from "next/link";
import { Card, Kyle, PageTitle, SectionHeading } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { EditionSwitcher, type EditionSwitcherProps } from "@/components/EditionSwitcher";
import { NotificationSettings, type NotificationSettingsProps } from "@/components/pwa/NotificationSettings";
import { InstallHelp } from "@/components/pwa/InstallSteps";
import { DiscordMock } from "@/components/tour/DiscordMock";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { DECORATION, Rich } from "@/components/ui/Rich";
import type { HelpSection } from "@/lib/discord/help";

export type HelpViewProps = {
  sections: HelpSection[];
  /** Current edition and the ones this person may switch to (see §Édition). */
  edition: Pick<EditionSwitcherProps, "current" | "options" | "action">;
  /** `?ok=` / `?error=` — the demo lands its « action simulée » flash here. */
  params?: Record<string, string | string[] | undefined>;
  /** Push switches and devices. Absent in the demo, which has no account. */
  push?: NotificationSettingsProps;
  demo?: boolean;
};

/**
 * Both moved to `components/ui/Rich.tsx`, where the guided tour and the public
 * guide reach them too. Re-exported so the existing importers keep working.
 */
export { DECORATION, Rich };

/** Help & rules — pure view, reused by /demo. */
export function HelpView({ sections, edition, params, push, demo }: HelpViewProps) {
  const home = demo ? "/demo" : "/home";

  return (
    <main className="help flex flex-1 flex-col gap-6 p-5">
      {params && <Flash params={params} />}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Kyle width={64} alt="Kyle, la mascotte" />
          <PageTitle className="min-w-0 flex-1">Aide &amp; règles</PageTitle>
        </div>
        <p className="meta lg accent">
          Toutes les règles du défi, et les mêmes réponses que <code>/help</code> sur Discord.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`${home}?tour=player&step=0`} className="btn ghost sm">
          Revoir la visite guidée
        </Link>
        {/* Le guide public : comment on entre dans un défi, et comment on en ouvre un. */}
        <Link href="/guide" className="btn ghost sm">
          Le guide pas à pas
        </Link>
      </div>

      <Card tier="flat" className="help-card" data-tour="help-discord">
        <h3>Sur Discord</h3>
        <p className="meta">
          Les mêmes actions, sans quitter la conversation. Les commandes de lecture ne fonctionnent que dans le salon <em>librairie</em> de ton équipe.
        </p>
        <DiscordMock />
      </Card>

      <div className="flex flex-col gap-4" data-tour="help-sections">
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
      </div>

      <section className="section" id="edition">
        <SectionHeading>Édition</SectionHeading>
        <EditionSwitcher current={edition.current} options={edition.options} action={edition.action} returnTo="/home" variant="section" />
        {!demo && (
          <Link href="/new" className="btn sm ghost self-start">
            Créer un défi
          </Link>
        )}
        <p className="meta-xs">
          Tout ce que tu vois (équipe, lectures, bingo, histoire) appartient à l’édition en cours. Changer d’édition ne perd rien.
        </p>
      </section>

      <section className="section">
        <SectionHeading>Thème</SectionHeading>
        <ThemeToggle />
        <p className="meta-xs">«&#8239;Auto&#8239;» suit le réglage de ton téléphone : clair «&#8239;Papier&#8239;» le jour, sombre «&#8239;Encre&#8239;» la nuit.</p>
      </section>

      {!demo && (
        <section className="section" id="install">
          <SectionHeading>Installer l’app</SectionHeading>
          <InstallHelp />
          <p className="meta-xs">
            Challenger s’ajoute à l’écran d’accueil comme une application : plein écran, sans barre d’adresse, et l’URL n’est plus à retrouver.
          </p>
        </section>
      )}

      {push && (
        <section className="section" id="notifications">
          <SectionHeading>Notifications</SectionHeading>
          <NotificationSettings {...push} />
          <p className="meta-xs">
            Les notifications arrivent sur les appareils que tu actives, un par un. Ce que tu reçois se règle ici pour tous tes appareils à la
            fois.
          </p>
        </section>
      )}
    </main>
  );
}
