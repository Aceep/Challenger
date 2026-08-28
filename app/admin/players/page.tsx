import { Flash } from "@/components/Flash";
import { getActiveChallenge, requireAdmin } from "@/lib/dal";
import { listInvites, listTeamsWithMembers, listUsersWithTeams } from "@/lib/services/admin";
import { InviteForm } from "./InviteForm";
import { assignTeamAction, deleteInviteAction, setRoleAction } from "./actions";

const field =
  "rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900";

export default async function AdminPlayersPage({ searchParams }: PageProps<"/admin/players">) {
  const params = await searchParams;
  const admin = await requireAdmin();
  const challenge = await getActiveChallenge();
  const [users, teams, invites] = await Promise.all([
    listUsersWithTeams(),
    challenge ? listTeamsWithMembers(challenge.id) : Promise.resolve([]),
    challenge ? listInvites(challenge.id) : Promise.resolve([]),
  ]);
  const pending = invites.filter((i) => !i.usedAt);

  return (
    <main className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Invitations</h1>
      <Flash params={params} />
        {!challenge ? (
          <p className="text-slate-500">Active un défi pour inviter des joueurs.</p>
        ) : (
          <>
            <InviteForm teams={teams.map((t) => ({ id: t.id, name: t.name }))} />
            {pending.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {pending.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-slate-900">
                    <code className="flex-1">{i.discordId}</code>
                    <span className="text-slate-500">{i.team?.name ?? "sans équipe"}</span>
                    {i.role === "ADMIN" && <span className="rounded bg-amber-100 px-1 text-xs text-amber-900">admin</span>}
                    <form action={deleteInviteAction}>
                      <input type="hidden" name="inviteId" value={i.id} />
                      <button className="text-red-600" aria-label="Retirer">✕</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Joueurs ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Nom</th>
                <th>Discord</th>
                <th>Livres</th>
                <th>Équipe</th>
                <th>Rôle</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-2 font-medium">{u.name ?? "—"}</td>
                  <td>
                    <code className="text-xs">{u.discordId ?? "—"}</code>
                  </td>
                  <td>{u._count.books}</td>
                  <td>
                    <form action={assignTeamAction} className="flex items-center gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="teamId" defaultValue={u.membership?.teamId ?? ""} className={field}>
                        <option value="">— aucune —</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <button className="underline">OK</button>
                    </form>
                  </td>
                  <td>
                    <form action={setRoleAction} className="flex items-center gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="role" defaultValue={u.role} className={field} disabled={u.id === admin.id}>
                        <option value="PLAYER">Joueur·euse</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      {u.id !== admin.id && <button className="underline">OK</button>}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
