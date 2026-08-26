import Link from "next/link";
import { prisma } from "@/lib/db";
import { getActiveChallenge } from "@/lib/dal";
import { getLeaderboard } from "@/lib/services/leaderboard";

export default async function AdminHome() {
  const challenge = await getActiveChallenge();
  const [users, pendingInvites] = await Promise.all([
    prisma.user.count(),
    prisma.invite.count({ where: { usedAt: null } }),
  ]);
  const rows = challenge ? await getLeaderboard(challenge.id) : [];

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Administration</h1>

      {!challenge && (
        <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Aucun défi actif.{" "}
          <Link href="/admin/challenge" className="underline">
            Créer ou activer un défi
          </Link>
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Défi" value={challenge?.name ?? "—"} />
        <Stat label="Équipes" value={rows.length} />
        <Stat label="Joueurs inscrits" value={users} />
        <Stat label="Invitations en attente" value={pendingInvites} />
      </section>

      {rows.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Classement</h2>
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.teamId} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-2">{r.rank}</td>
                  <td className="py-2 font-medium">{r.name}</td>
                  <td className="py-2 text-right">{r.points} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="truncate text-xl font-bold">{value}</p>
    </div>
  );
}
