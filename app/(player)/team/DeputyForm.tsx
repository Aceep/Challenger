import { Card } from "@/components/ui";

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
    <Card tier="raised">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="teamId" value={teamId} />
        <label className="field flex-1">
          Nommer l’adjoint·e
          <select name="userId" defaultValue={current}>
            <option value="">— personne —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn sm">OK</button>
      </form>
    </Card>
  );
}
