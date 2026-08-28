import Link from "next/link";
import { getCurrentPlayer } from "@/lib/dal";
import { helpSections } from "@/lib/discord/help";

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

export default async function HelpPage() {
  await getCurrentPlayer();
  const sections = helpSections({ library: "le salon librairie de ton équipe", adventure: "le salon aventure de ton équipe" });
  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <header>
        <Link href="/" className="text-sm text-slate-500">
          ← Accueil
        </Link>
        <h1 className="text-2xl font-bold">Aide et règles</h1>
        <p className="text-sm text-slate-500">Les commandes citées se lancent sur Discord ; tout se fait aussi ici, sur le site.</p>
      </header>
      {sections.map((s) => (
        <section key={s.title} className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <h2 className="mb-2 font-semibold">{s.title}</h2>
          <ul className="flex list-inside list-disc flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
            {s.lines.map((l, i) => (
              <li key={i}>
                <Rich text={l} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
