import { setDeputyAction } from "./actions";

export function DeputyForm({ teamId, members, current }: { teamId: string; members: { id: string; name: string }[]; current: string }) {
  return (
    <form action={setDeputyAction} className="mt-2 flex items-center gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <label className="flex items-center gap-2">
        Nommer l&apos;adjoint·e
        <select name="userId" defaultValue={current} className="rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
          <option value="">— personne —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <button className="underline">OK</button>
    </form>
  );
}
