import Link from "next/link";
import { signOut } from "@/auth";
import { getCurrentPlayer } from "@/lib/dal";
import { listBooks } from "@/lib/services/books";
import { getTeamScore } from "@/lib/services/leaderboard";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export default async function HomePage() {
  const { user, team } = await getCurrentPlayer();
  const [score, books] = await Promise.all([
    team ? getTeamScore(team.id) : Promise.resolve(0),
    listBooks(user.id),
  ]);
  const myPoints = books.reduce((n, b) => n + b.pointEvents.reduce((m, e) => m + e.amount, 0), 0);
  const graphics = books.filter((b) => b.isGraphic).length;

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Salut {user.name ?? "lecteur·ice"} 👋</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="text-sm text-slate-500 underline">Déconnexion</button>
        </form>
      </header>

      {team && team.challenge.endAt < new Date() && (
        <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          🏁 Le défi est terminé : les scores sont figés. Merci d&apos;avoir joué !
        </p>
      )}
      {team ? (
        <section
          className="rounded-2xl border-2 p-4 text-slate-900 dark:text-slate-100"
          style={{ borderColor: team.color }}
        >
          <Link href="/team" className="flex items-center justify-between text-sm text-slate-500">
            <span>Équipe {team.name}</span>
            <span className="underline">Détails →</span>
          </Link>
          <p className="text-4xl font-black">{score} pts</p>
          <p className="mt-1 text-sm text-slate-500">
            {team.challenge.name} · du {dateFmt.format(team.challenge.startAt)} au{" "}
            {dateFmt.format(team.challenge.endAt)}
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed p-4 text-slate-600 dark:text-slate-400">
          Tu n&apos;as pas encore d&apos;équipe. Un organisateur va t&apos;en attribuer une.
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <p className="text-sm text-slate-500">Mes lectures</p>
          <p className="text-2xl font-bold">{books.length - graphics}</p>
          <p className="text-xs text-slate-500">
            livre{books.length - graphics > 1 ? "s" : ""} · {graphics} graphique{graphics > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <p className="text-sm text-slate-500">Mes points</p>
          <p className="text-2xl font-bold">{myPoints}</p>
        </div>
      </section>

      <Link
        href="/books/new"
        className="rounded-xl bg-indigo-600 py-3 text-center text-lg font-semibold text-white shadow hover:bg-indigo-700"
      >
        + J&apos;ai fini un livre
      </Link>
    </main>
  );
}
