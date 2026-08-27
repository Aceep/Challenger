import Link from "next/link";
import { getCurrentPlayer } from "@/lib/dal";
import { getTeamStats } from "@/lib/services/team";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const SOURCE_LABEL: Record<string, string> = { READING: "Lecture", BINGO: "Bingo", QUEST: "Quêtes", STORY: "Histoire", ADMIN: "Ajustements" };

export default async function TeamPage() {
  const { team } = await getCurrentPlayer();
  if (!team) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1 className="text-2xl font-bold">Mon équipe</h1>
        <p className="text-slate-500">Tu n&apos;as pas encore d&apos;équipe.</p>
      </main>
    );
  }
  const stats = await getTeamStats(team.id);

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <header>
        <Link href="/" className="text-sm text-slate-500">
          ← Accueil
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: team.color }}>
          {team.name}
        </h1>
        <p className="text-sm text-slate-500">{stats.total} pts au total</p>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(SOURCE_LABEL).map(([k, label]) =>
          stats.bySource[k] !== undefined ? (
            <div key={k} className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold">{stats.bySource[k]}</p>
            </div>
          ) : null,
        )}
      </section>

      {stats.modifiers.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950">
          {stats.modifiers.map((m) => (
            <p key={m.id}>
              ⚡ {m.label} : points ×{m.multiplier} jusqu&apos;au {dateFmt.format(m.endAt)}
            </p>
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Membres</h2>
        <ul className="flex flex-col gap-2">
          {stats.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {m.isCaptain && "⭐ "}
                  {m.name}
                </p>
                <p className="text-xs text-slate-500">
                  {m.books} livre{m.books > 1 ? "s" : ""} · {m.graphics} graphique{m.graphics > 1 ? "s" : ""} · {m.pages} pages
                </p>
              </div>
              <span className="font-bold">{m.points} pts</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Derniers points</h2>
        {stats.recent.length === 0 ? (
          <p className="text-sm text-slate-500">Rien pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {stats.recent.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-1 dark:border-slate-800">
                <span className="min-w-0 truncate">
                  {e.label}
                  {e.who && <span className="text-slate-500"> · {e.who}</span>}
                </span>
                <span className={`shrink-0 font-semibold ${e.amount < 0 ? "text-red-600" : "text-green-700"}`}>
                  {e.amount > 0 ? "+" : ""}
                  {e.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
