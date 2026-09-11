import Image from "next/image";
import Link from "next/link";
import { InstallButton } from "@/components/landing/InstallButton";
import { Card, Kyle } from "@/components/ui";
import { Rich } from "@/components/ui/Rich";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ORGANIZER_STEPS, PLAYER_STEPS, type GuideStep } from "@/lib/guide/steps";

/**
 * The public step-by-step guide (`/guide`) — no session, no database, no
 * Discord call: the copy comes from `lib/guide/steps.ts` and the install link
 * from the environment. Reuses the landing container (`.landing`), which gives
 * the side gutter and the maximum width; the steps themselves are plain cards,
 * readable down to 390 px.
 */

function Step({ step, index }: { step: GuideStep; index: number }) {
  return (
    <Card as="li" tier="flat" id={step.id} className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-[var(--r-pill)] bg-[color:var(--hi)] font-display text-[15px] font-black text-[color:var(--ink)]"
        >
          {index + 1}
        </span>
        <h3 className="min-w-0 font-display text-[length:var(--fs-d2)] leading-tight font-black">{step.title}</h3>
      </div>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-[color:var(--ink-2)]">
        {step.lines.map((line, i) => (
          <li key={i}>
            <Rich text={line} />
          </li>
        ))}
      </ul>
      {step.commands?.length ? (
        <p className="flex flex-wrap gap-2">
          {step.commands.map((command) => (
            <code key={command} className="rounded-[var(--r-xs)] border border-[color:var(--line)] bg-[color:var(--surface-2)] px-2 py-1 text-[length:var(--fs-sm)]">
              {command}
            </code>
          ))}
        </p>
      ) : null}
      {/* Captures d'écran : `public/guide/<id>.png`, en 1280 × 720. Tant qu'une
          étape n'en a pas, elle n'affiche pas de cadre vide. */}
      {step.screenshot && (
        <figure className="m-0 flex flex-col gap-2">
          <Image
            src={step.screenshot}
            alt={step.screenshotAlt ?? ""}
            width={1280}
            height={720}
            sizes="(max-width: 820px) 100vw, 720px"
            className="h-auto w-full rounded-[var(--r-md)] border border-[color:var(--line)]"
          />
          {step.screenshotAlt && <figcaption className="meta-xs">{step.screenshotAlt}</figcaption>}
        </figure>
      )}
    </Card>
  );
}

function Steps({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="flex max-w-[760px] list-none flex-col gap-4 p-0">
      {steps.map((step, i) => (
        <Step key={step.id} step={step} index={i} />
      ))}
    </ol>
  );
}

export function GuideView({ installUrl }: { installUrl: string | null }) {
  return (
    <main className="landing">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 font-display text-[18px] font-black no-underline">
          <Kyle width={25} alt="Kyle, la mascotte de Challenger" />
          Challenger
        </Link>
        <span className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="btn sm">
            Se connecter
          </Link>
        </span>
      </header>

      <section className="flex flex-col gap-4">
        <p className="eyebrow">Guide</p>
        <h1 className="font-display text-[clamp(32px,5vw,52px)] leading-[1.05] font-black tracking-[-0.02em]">Lancer un défi lecture, pas à pas.</h1>
        <p className="max-w-[34em] text-[17px] text-[color:var(--muted)]">
          Kyle est un bot Discord&nbsp;: on l’ajoute à son serveur, on tape une commande, et le site s’occupe du reste. Voici les deux parcours, celui de
          l’organisateur·ice et celui des joueur·euses.
        </p>
        <div className="flex flex-wrap gap-3">
          <InstallButton url={installUrl} />
          <Link href="/new" className="btn ghost">
            Créer mon défi
          </Link>
        </div>
        <p className="text-[length:var(--fs-sm)] text-[color:var(--muted)]">
          Tu viens d’être invité·e&nbsp;?{" "}
          <Link href="#ton-invitation" className="underline">
            Va directement à la partie joueur·euse
          </Link>
          .
        </p>
      </section>

      <section className="landing-section flex flex-col gap-5" id="organisateur">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Organisateur·ice</p>
          <h2>Lancer un défi en dix minutes</h2>
        </div>
        <Steps steps={ORGANIZER_STEPS} />
      </section>

      <section className="landing-section flex flex-col gap-5" id="joueur">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Joueur·euse</p>
          <h2>Rejoindre et jouer</h2>
        </div>
        <Steps steps={PLAYER_STEPS} />
      </section>

      <section className="landing-section">
        <Card className="flex max-w-[760px] flex-col items-start gap-3">
          <h2 className="text-[length:var(--fs-d2)]">Prêt·e&nbsp;?</h2>
          <p className="text-[color:var(--ink-2)]">
            Le défi commence par un clic&nbsp;: Kyle rejoint ton serveur, puis la commande <code>/challenger creer</code> ouvre l’édition. Tout le reste se règle
            tranquillement sur le site.
          </p>
          <div className="flex flex-wrap gap-3">
            <InstallButton url={installUrl} />
            <Link href="/demo?tour=player&step=0" className="btn ghost">
              Visite guidée avec Kyle
            </Link>
          </div>
        </Card>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-4 text-[13px] text-[color:var(--muted)]">
        <Link href="/" className="underline">
          Accueil
        </Link>
        <Link href="/new" className="underline">
          Créer mon défi
        </Link>
        <Link href="/demo" className="underline">
          Démo joueur
        </Link>
        <Link href="/login" className="underline">
          Se connecter avec Discord
        </Link>
      </footer>
    </main>
  );
}
