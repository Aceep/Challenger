import Link from "next/link";
import { Card, KyleEmpty, Pill } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { teamDiscordReady } from "@/lib/discord/permissions";
import { fmtPoints } from "@/lib/format";
import type { ActionState } from "@/lib/forms";
import { TeamEditModal } from "./TeamEditModal";
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
  /** Discord role carried by the team members (created by the bot setup). */
  discordRole: string | null;
  gridLabel: string;
  points: number;
};

export type TeamsViewProps = {
  teams: AdminTeamRow[];
  hasChallenge: boolean;
  /** Team currently open in the edit modal (`?edit=<id>`). */
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
          <Card data-tour="teams-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Équipe</th>
                  <th>Membres</th>
                  <th>Capitaine</th>
                  <th>Adjoint·e</th>
                  <th>Discord</th>
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
                    <td>
                      {teamDiscordReady({ discordRoleId: t.discordRole, discordChannelId: t.adventureChannel, discordLibraryChannelId: t.libraryChannel }) ? (
                        <Pill tone="ok">rôle et salons ✓</Pill>
                      ) : (
                        <Link href={demo ? "/demo/admin/challenge" : "/admin/challenge"} className="underline">
                          <Pill tone="no">à configurer</Pill>
                        </Link>
                      )}
                    </td>
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

          <TeamForm action={createTeamAction} />

          {editing && (
            <TeamEditModal
              team={editing}
              base={base}
              updateTeamAction={updateTeamAction}
              deleteTeamAction={deleteTeamAction}
              setCaptainAction={setCaptainAction}
              setDeputyAction={setDeputyAction}
            />
          )}
        </>
      )}
    </>
  );
}
