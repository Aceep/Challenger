import Link from "next/link";
import { Card, KyleEmpty, Pill } from "@/components/ui";
import { DataTable } from "@/components/ui/DataTable";
import { SubmitButton } from "@/components/ui/SubmitButton";
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
  /** The pinned guide card is published in the librairie. */
  guidePublished: boolean;
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
  publishGuideAction: (formData: FormData) => Promise<void>;
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
  publishGuideAction,
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
            <DataTable
              head={[
                "Équipe",
                "Membres",
                "Capitaine",
                "Adjoint·e",
                "Discord",
                "Grille",
                { label: "Points", className: "text-right" },
                "",
              ]}
            >
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
                    <div className="flex flex-wrap items-center gap-1">
                      {teamDiscordReady({ discordRoleId: t.discordRole, discordChannelId: t.adventureChannel, discordLibraryChannelId: t.libraryChannel }) ? (
                        <Pill tone="ok">rôle et salons ✓</Pill>
                      ) : (
                        <Link href={demo ? "/demo/admin/challenge" : "/admin/challenge"} className="underline">
                          <Pill tone="no">à configurer</Pill>
                        </Link>
                      )}
                      {t.guidePublished && (
                        <Pill tone="ok" xs>
                          guide publié
                        </Pill>
                      )}
                    </div>
                  </td>
                  <td className="num">{t.gridLabel}</td>
                  <td className="num text-right font-extrabold">{fmtPoints(t.points)}</td>
                  <td>
                    <div className="flex flex-col items-start gap-2">
                      <Link href={`${base}?edit=${t.id}`} className="underline">
                        Modifier
                      </Link>
                      <form action={publishGuideAction}>
                        <input type="hidden" name="teamId" value={t.id} />
                        <SubmitButton className="btn small ghost whitespace-nowrap" pendingLabel="Publication…" disabled={!t.libraryChannel}>
                          Publier le guide
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
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
