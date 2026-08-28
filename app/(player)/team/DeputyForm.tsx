export function DeputyForm({
  teamId,
  members,
  current,
  action,
}: {
  teamId: string;
  members: { id: string; name: string }[];
  current: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <label className="field flex-1">
        Nommer l&apos;adjoint·e
        <select name="userId" defaultValue={current}>
          <option value="">— personne —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <button className="btn small">OK</button>
    </form>
  );
}
