/**
 * The light markup shared by every piece of copy written once for Discord and
 * for the web: `lib/discord/help.ts`, `lib/tour/steps.ts`, `lib/guide/steps.ts`.
 *
 * It lives here rather than in a route file because the help page, the guided
 * tour, the public guide — and the tests that check the copy — all need it.
 */

/**
 * On Discord the emoji of a section title carry the tone. On screen the
 * typography does that job, so they are dropped at render time rather than in
 * the source: the wording stays one single text.
 */
export const DECORATION = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]\s?/gu;

/** Renders "**bold**" segments from the shared lines (italics are unwrapped). */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part.replace(/\*([^*]+)\*/g, "$1")}</span>,
      )}
    </>
  );
}
