import { Avatar, Card, Eyebrow, KyleEmpty, Pill } from "@/components/ui";
import { DataTable } from "@/components/ui/DataTable";
import { Flash } from "@/components/Flash";
import type { ActionState } from "@/lib/forms";
import { InviteForm } from "./InviteForm";

export type PlayerRow = {
  id: string;
  name: string;
  discordId: string | null;
  teamId: string;
  teamName: string | null;
  isCaptain: boolean;
  role: "ORGANIZER" | "PLAYER";
  books: number;
  isMe: boolean;
};

export type PlayersViewProps = {
  players: PlayerRow[];
  teams: { id: string; name: string; color: string }[];
  invites: { id: string; discordId: string; teamName: string | null; role: "ORGANIZER" | "PLAYER" }[];
  hasChallenge: boolean;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  createInviteAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  deleteInviteAction: (formData: FormData) => Promise<void>;
  assignTeamAction: (formData: FormData) => Promise<void>;
  setRoleAction: (formData: FormData) => Promise<void>;
};

const shortId = (id: string | null) => (id && id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : (id ?? "—"));

/** Admin › Joueurs & invitations — pure view, reused by /demo/admin. */
export function PlayersView({
  players,
  teams,
  invites,
  hasChallenge,
  params,
  createInviteAction,
  deleteInviteAction,
  assignTeamAction,
  setRoleAction,
}: PlayersViewProps) {
  const colorOf = (id: string) => teams.find((t) => t.id === id)?.color ?? "var(--olive)";

  return (
    <>
      <div className="topline">
        <h1>Joueurs &amp; invitations</h1>
      </div>
      <Flash params={params} />

      <div className="two">
        <Card>
          <Eyebrow>Joueurs ({players.length})</Eyebrow>
          <DataTable head={["Joueur", "Discord", "Équipe", "Rôle", { label: "Lectures", className: "text-right" }]}>
            {players.map((u) => (
              <tr key={u.id}>
                <td className="flex items-center gap-2">
                  <Avatar name={u.name} color={colorOf(u.teamId)} /> {u.name}
                </td>
                <td className="num">
                  <code>{shortId(u.discordId)}</code>
                </td>
                <td>
                  <form action={assignTeamAction} className="flex items-center gap-1">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="teamId" defaultValue={u.teamId} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2 py-1 text-sm">
                      <option value="">— aucune —</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {u.isCaptain && <span title="capitaine">⭐</span>}
                    <button className="underline">OK</button>
                  </form>
                </td>
                <td>
                  <form action={setRoleAction} className="flex items-center gap-1">
                    <input type="hidden" name="userId" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role}
                      disabled={u.isMe}
                      className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-2 py-1 text-sm"
                    >
                      <option value="PLAYER">Joueur·euse</option>
                      <option value="ORGANIZER">Organisateur·ice</option>
                    </select>
                    {!u.isMe && <button className="underline">OK</button>}
                  </form>
                </td>
                <td className="num text-right">{u.books}</td>
              </tr>
            ))}
          </DataTable>
        </Card>

        <div className="flex flex-col gap-4" data-tour="players-invites">
          {hasChallenge ? <InviteForm teams={teams} action={createInviteAction} /> : <KyleEmpty>Active un défi pour inviter des joueurs.</KyleEmpty>}
          <Card>
            <Eyebrow>Invitations en attente ({invites.length})</Eyebrow>
            {invites.length === 0 ? (
              <p className="text-[13px] text-[color:var(--muted)]">Aucune invitation en attente.</p>
            ) : (
              <DataTable headless head={["Discord", "Équipe", "Statut", ""]}>
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td className="num">
                      <code>{shortId(i.discordId)}</code>
                    </td>
                    <td>{i.teamName ?? "sans équipe"}</td>
                    <td>{i.role === "ORGANIZER" ? <Pill tone="ok">organisateur·ice</Pill> : <Pill tone="wait">non utilisée</Pill>}</td>
                    <td>
                      <form action={deleteInviteAction}>
                        <input type="hidden" name="inviteId" value={i.id} />
                        <button className="text-[color:var(--brick)] underline">Retirer</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
