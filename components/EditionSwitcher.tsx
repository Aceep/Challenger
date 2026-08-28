"use client";

import { Pill } from "@/components/ui";
import { ChevronDownIcon, SwapIcon } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type EditionStatus = "DRAFT" | "ACTIVE" | "FINISHED";
export type EditionRole = "ORGANIZER" | "PLAYER";

/** One edition the person may switch to. */
export type EditionOption = { id: string; name: string; color: string; status: EditionStatus; role: EditionRole };

export type EditionSwitcherProps = {
  /** The edition on screen right now, null when the person belongs to none. */
  current: { id: string; name: string; color: string; role: EditionRole } | null;
  options: EditionOption[];
  action: (formData: FormData) => Promise<void>;
  /** Where the caller would like to land — capped by the action to what the new role allows. */
  returnTo: "/home" | "/admin";
  /** `rail` folds into a <details> in the admin rail, `section` lies flat in Aide. */
  variant: "rail" | "section";
};

const STATUS: Record<EditionStatus, string> = { ACTIVE: "actif", DRAFT: "brouillon", FINISHED: "terminé" };
const ROLE: Record<EditionRole, string> = { ORGANIZER: "organisateur·ice", PLAYER: "joueur·euse" };

/**
 * Switch edition — one `<form>` per target, so it works without JavaScript and
 * needs no dropdown primitive. The current edition is always spelled out: two
 * editions must never be confused for one another.
 */
export function EditionSwitcher({ current, options, action, returnTo, variant }: EditionSwitcherProps) {
  const others = options.filter((o) => o.id !== current?.id);

  // The rail is narrow and everyone there is an organiser: no role badge.
  const head = current ? (
    <>
      <span className="dot" style={{ background: current.color }} />
      <span className="name">{current.name}</span>
      {variant === "section" && (
        <Pill tone="type" xs>
          {ROLE[current.role]}
        </Pill>
      )}
    </>
  ) : (
    <span className="name">Aucune édition</span>
  );

  const list = others.length > 0 && (
    <div className="ed-list">
      {others.map((o) => (
        <form key={o.id} action={action}>
          <input type="hidden" name="challengeId" value={o.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <SubmitButton className="ed-option" pendingLabel="Changement…">
            <span className="dot" style={{ background: o.color }} />
            <span className="name">{o.name}</span>
            <span className="state">{STATUS[o.status]}</span>
            <SwapIcon className="ico-sm" />
          </SubmitButton>
        </form>
      ))}
    </div>
  );

  if (variant === "rail") {
    // A single edition has nothing to disclose: the header alone, no caret.
    if (!list) return <p className="ed-head">{head}</p>;
    return (
      <details className="ed-switch">
        <summary>
          {head}
          <ChevronDownIcon className="ico-sm chev" />
        </summary>
        {list}
      </details>
    );
  }

  return (
    <div className="ed-switch flat">
      <p className="ed-head">{head}</p>
      {list || <p className="meta-xs">{current ? "Tu n’as accès qu’à cette édition." : "Aucune édition ne t’est ouverte pour l’instant."}</p>}
    </div>
  );
}
