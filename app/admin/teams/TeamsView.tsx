import Link from "next/link";
import { Card, Eyebrow, KyleEmpty, Pill } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { fmtPoints } from "@/lib/format";
import type { ActionState } from "@/lib/forms";
import { TeamForm } from "./TeamForm";

export type AdminTeamRow = {
  id: string;
  name: string;
  color: string;
  members: { id: string; name: string }[];
  captain: string | null;
  captainId: string;
  deputy: string | null;
  deputyId: string;
  adventureChannel: string | null;
  libraryChannel: string | null;
  gridLabel: string;
  points: number;
};

export type TeamsViewProps = {
  teams: AdminTeamRow[];
  hasChallenge: boolean;
  /** Team currently open in the edit card (`?edit=<id>`). */
  editingId: string | null;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  createTeamAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  updateTeamAction: (formData: FormData) => Promise<void>;
  deleteTeamAction: (formData: FormData) => Promise<void>;
  setCaptainAction: (formData: FormData) => Promise<void>;
  setDeputyAction: (formData: FormData) => Promise<void>;
};

/** Admin › Équipes — pure view, reused by /demo/admin. */
export function TeamsView({
  teams,
  hasChallenge,
  editingId,
  params,
  demo,
  createTeamAction,
  updateTeamAction,
  deleteTeamAction,
  setCaptainAction,
  setDeputyAction,
}: TeamsViewProps) {
  const base = demo ? "/demo/admin/teams" : "/admin/teams";
  const editing = teams.find((t) => t.id === editingId) ?? null;

  return (
    <>
      <div className="topline">
        <h1>Équipes</h1>
      </div>
      <Flash params={params} />

      {!hasChallenge ? (
        <KyleEmpty>Active un défi pour créer des équipes.</KyleEmpty>
      ) : (
        <>
          <Card>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Équipe</th>
                  <th>Membres</th>
                  <th>Capitaine</th>
                  <th>Adjoint·e</th>
                  <th>Salon aventure</th>
                  <th>Salon librairie</th>
                  <th>Grille</th>
                  <th className="text-right">Points</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="dot" style={{ background: t.color }} />
                      <strong>{t.name}</strong>
                    </td>
                    <td className="num">{t.members.length}</td>
                    <td>{t.captain ?? <Pill tone="no">à nommer</Pill>}</td>
                    <td>{t.deputy ?? <Pill tone="no">à nommer</Pill>}</td>
                    <td>{t.adventureChannel ? <code>{t.adventureChannel}</code> : <Pill tone="no">manquant</Pill>}</td>
                    <td>{t.libraryChannel ? <code>{t.libraryChannel}</code> : <Pill tone="no">manquant</Pill>}</td>
                    <td className="num">{t.gridLabel}</td>
                    <td className="num text-right font-extrabold">{fmtPoints(t.points)}</td>
                    <td>
                      <Link href={`${base}?edit=${t.id}`} className="underline">
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {editing ? (
            <Card className="form-grid" style={{ border: "1.5px solid var(--kyle-deep)" }}>
              <Eyebrow className="wide">Modifier · {editing.name}</Eyebrow>
              <form action={updateTeamAction} className="wide form-grid">
                <input type="hidden" name="teamId" value={editing.id} />
                <label className="field">
                  Nom
                  <input name="name" defaultValue={editing.name} required />
                </label>
                <label className="field">
                  Couleur
                  <input name="color" type="color" defaultValue={editing.color} />
                </label>
                <label className="field">
                  Salon aventure (id)
                  <input name="discordChannelId" defaultValue={editing.adventureChannel ?? ""} placeholder="id du salon #aventure" />
                </label>
                <label className="field">
                  Salon librairie (id)
                  <input
                    name="discordLibraryChannelId"
                    defaultValue={editing.libraryChannel ?? ""}
                    placeholder="id du salon #librairie"
                    style={editing.libraryChannel ? undefined : { borderColor: "var(--brick)" }}
                  />
                  {!editing.libraryChannel && (
                    <span className="hint" style={{ color: "var(--brick)" }}>
                      Sans ce salon, /ajouter-un-livre est refusé pour cette équipe.
                    </span>
                  )}
                </label>
                <div className="wide flex flex-wrap items-center gap-2.5">
                  <button className="btn">Enregistrer</button>
                  <Link href={base} className="btn ghost">
                    Fermer
                  </Link>
                </div>
              </form>

              <form action={setCaptainAction} className="field">
                <input type="hidden" name="teamId" value={editing.id} />
                <span>Capitaine</span>
                <select name="userId" defaultValue={editing.captainId}>
                  <option value="">— aucun·e —</option>
                  {editing.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button className="btn small ghost mt-1 self-start">Enregistrer le capitaine</button>
              </form>

              <form action={setDeputyAction} className="field">
                <input type="hidden" name="teamId" value={editing.id} />
                <span>Adjoint·e</span>
                <select name="userId" defaultValue={editing.deputyId}>
                  <option value="">— aucun·e —</option>
                  {editing.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <span className="hint">Le·la capitaine peut aussi le·la nommer depuis sa page d&apos;équipe.</span>
                <button className="btn small ghost mt-1 self-start">Enregistrer l&apos;adjoint·e</button>
              </form>

              <form action={deleteTeamAction} className="wide flex justify-end">
                <input type="hidden" name="teamId" value={editing.id} />
                <button className="btn danger">Supprimer l&apos;équipe</button>
              </form>
            </Card>
          ) : (
            <TeamForm action={createTeamAction} />
          )}
        </>
      )}
    </>
  );
}
