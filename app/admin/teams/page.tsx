import { getActiveChallenge } from "@/lib/dal";
import { listTeamsWithMembers } from "@/lib/services/admin";
import { TeamForm } from "./TeamForm";
import { deleteTeamAction, setCaptainAction, setDeputyAction, updateTeamAction } from "./actions";

const field =
  "rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900";

export default async function AdminTeamsPage() {
  const challenge = await getActiveChallenge();
  const teams = challenge ? await listTeamsWithMembers(challenge.id) : [];

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Équipes</h1>
      {!challenge ? (
        <p className="text-slate-500">Active un défi pour créer des équipes.</p>
      ) : (
        <>
          <TeamForm />
          <ul className="flex flex-col gap-4">
            {teams.map((t) => (
              <li key={t.id} className="rounded-xl border-l-4 bg-white p-4 shadow-sm dark:bg-slate-900" style={{ borderLeftColor: t.color }}>
                <form action={updateTeamAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="teamId" value={t.id} />
                  <input name="name" defaultValue={t.name} required className={`${field} font-semibold`} />
                  <input name="color" type="color" defaultValue={t.color} className="h-8 w-12 cursor-pointer rounded" />
                  <input name="discordChannelId" defaultValue={t.discordChannelId ?? ""} placeholder="Salon aventure (id)" className={field} />
                  <input name="discordLibraryChannelId" defaultValue={t.discordLibraryChannelId ?? ""} placeholder="Salon librairie (id)" className={field} />
                  <button className="text-sm underline">Enregistrer</button>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-slate-500">
                    {t.members.length} membre{t.members.length > 1 ? "s" : ""} :
                  </span>
                  {t.members.map((m) => (
                    <span key={m.userId} className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                      {m.user.name ?? m.user.discordId}
                      {t.captainId === m.userId && " ⭐"}
                      {t.deputyId === m.userId && " 🎖️"}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <form action={setCaptainAction} className="flex items-center gap-2 text-sm">
                    <input type="hidden" name="teamId" value={t.id} />
                    <label>
                      Capitaine{" "}
                      <select name="userId" defaultValue={t.captainId ?? ""} className={field}>
                        <option value="">— aucun —</option>
                        {t.members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user.name ?? m.user.discordId}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="underline">OK</button>
                  </form>
                  <form action={setDeputyAction} className="flex items-center gap-2 text-sm">
                    <input type="hidden" name="teamId" value={t.id} />
                    <label>
                      Adjoint·e{" "}
                      <select name="userId" defaultValue={t.deputyId ?? ""} className={field}>
                        <option value="">— aucun·e —</option>
                        {t.members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user.name ?? m.user.discordId}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="underline">OK</button>
                  </form>
                  <form action={deleteTeamAction}>
                    <input type="hidden" name="teamId" value={t.id} />
                    <button className="text-sm text-red-600 underline">Supprimer l&apos;équipe</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
