"use client";

import { Button } from "@/components/ui";
import { promptInstall, useMounted, usePwa, type InstallPromptEvent, type Platform } from "./pwa-store";

/** The square with an upward arrow: Safari's « Partager » button. */
function ShareIcon({ className = "ico" }: { className?: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M12 3.5v11" />
      <path d="m8.5 7 3.5-3.5L15.5 7" />
      <path d="M6.5 11.5h-2v9h15v-9h-2" />
    </svg>
  );
}

/** The square with a plus: « Sur l'écran d'accueil ». */
function AddToHomeIcon({ className = "ico" }: { className?: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

type Step = { label: string; hint: string; Icon?: (props: { className?: string }) => React.ReactElement };

const IOS_STEPS: readonly Step[] = [
  { label: "Touche Partager", hint: "en bas de Safari", Icon: ShareIcon },
  { label: "Sur l’écran d’accueil", hint: "dans la liste qui s’ouvre", Icon: AddToHomeIcon },
  { label: "Ajouter", hint: "en haut à droite" },
];

function Steps({ steps }: { steps: readonly Step[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-start gap-2">
          <span
            aria-hidden
            className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-[color:var(--kyle)] text-[11px] font-bold text-[color:var(--ink)]"
          >
            {i + 1}
          </span>
          {step.Icon ? <step.Icon className="ico shrink-0 mt-px" /> : null}
          <span className="min-w-0 text-[length:var(--fs-sm)]">
            <strong>{step.label}</strong> <span className="text-[color:var(--muted)]">— {step.hint}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The instructions, shared by the home card and the Aide section.
 *
 * Any browser that offered `beforeinstallprompt` (Chrome on Android, the
 * desktop browsers) has nothing to read: a button is enough. iPhone has no
 * native prompt, hence the three steps. Anywhere else, one sentence.
 */
export function InstallSteps({ platform, installEvent }: { platform: Platform; installEvent: InstallPromptEvent | null }) {
  if (installEvent) {
    return (
      <Button size="lg" onClick={() => void promptInstall()} className="self-start">
        Installer
      </Button>
    );
  }

  if (platform === "ios") return <Steps steps={IOS_STEPS} />;

  return <p className="meta">Ouvre le menu de ton navigateur, puis «&#8239;Installer l’application&#8239;».</p>;
}

/**
 * The body of the « Installer l'app » section in Aide: the same instructions,
 * without « Plus tard », and a plain statement once it is done.
 *
 * Nothing before mount: the platform is only known in the browser, and showing
 * the generic sentence only to replace it with the iPhone steps a millisecond
 * later would be visible.
 */
export function InstallHelp() {
  const { standalone, platform, installEvent } = usePwa();
  const mounted = useMounted();

  if (!mounted) return null;
  if (standalone) return <p className="meta">L’app est installée sur cet appareil.</p>;
  return <InstallSteps platform={platform} installEvent={installEvent} />;
}
