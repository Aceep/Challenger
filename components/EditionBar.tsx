import Link from "next/link";

/**
 * Permanent reminder of the edition being looked at, at the top of every player
 * screen. Several editions coexist: nothing on screen means the same thing from
 * one to the next, so the current one is never implicit.
 *
 * `href` is only given when there is somewhere to switch to.
 */
export function EditionBar({ name, color, href }: { name: string; color: string; href?: string }) {
  return (
    <aside className="edition-bar" aria-label="Édition en cours">
      <span className="dot" style={{ background: color }} />
      <span className="lbl">Édition</span>
      <strong className="name">{name}</strong>
      {href && (
        <Link href={href} className="switch">
          Changer
        </Link>
      )}
    </aside>
  );
}
