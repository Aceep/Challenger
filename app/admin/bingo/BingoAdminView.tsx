import Link from "next/link";
import { BingoBoard, type BoardCell } from "@/app/(player)/bingo/BingoBoard";
import { Card, Eyebrow, KyleEmpty, Pill } from "@/components/ui";
import { Flash } from "@/components/Flash";
import type { ActionState } from "@/lib/forms";
import { GridForm, type GridValues } from "./GridForm";

export type GridProgress = "done" | "half" | "free";

/** The active grid of one team, with the readings the admin may move around. */
export type TeamBoard = {
  teamId: string;
  teamName: string;
  grid: { id: string; order: number; title: string; size: number; cells: BoardCell[]; completedLines: number } | null;
  total: number;
  history: { id: string; order: number; title: string; completedAt: Date | null }[];
  books: { id: string; title: string; type: "ROMAN" | "GRAPHIQUE"; owner: string; placedOn: string | null }[];
};

export type AdminGridRow = GridValues & {
  id: string;
  order: number;
  /** Per team: null when the team has not opened the grid yet, "done" when finished. */
  teams: { teamId: string; name: string; cells: GridProgress[] | null; completed: boolean }[];
};

export type BingoAdminViewProps = {
  grids: AdminGridRow[];
  teams: { id: string; name: string; color: string }[];
  hasChallenge: boolean;
  bonus: { line: number; full: number };
  /** Grid currently open in the edit form (`?edit=<id>`). */
  editingId: string | null;
  params: Record<string, string | string[] | undefined>;
  /** Team whose board is shown below the table (`?team=<id>`). */
  teamBoard: TeamBoard | null;
  demo?: boolean;
  saveGridAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  moveGridAction: (formData: FormData) => Promise<void>;
  deleteGridAction: (formData: FormData) => Promise<void>;
  placeTeamBookAction: (formData: FormData) => Promise<void>;
  removeTeamBookAction: (formData: FormData) => Promise<void>;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

function MiniGrid({ cells, size }: { cells: GridProgress[]; size: number }) {
  return (
    <div className="mini-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: size * 18 }}>
      {cells.map((c, i) => (
        <i key={i} className={c === "done" ? "d" : c === "half" ? "h" : ""} />
      ))}
    </div>
  );
}

/** Admin › Bingo — pure view, reused by /demo/admin. */
export function BingoAdminView({
  grids,
  teams,
  hasChallenge,
  bonus,
  editingId,
  params,
  teamBoard,
  demo,
  saveGridAction,
  moveGridAction,
  deleteGridAction,
  placeTeamBookAction,
  removeTeamBookAction,
}: BingoAdminViewProps) {
  const base = demo ? "/demo/admin/bingo" : "/admin/bingo";
  const editing = grids.find((g) => g.id === editingId) ?? null;

  return (
    <>
      <div className="topline">
        <h1>Bingo</h1>
        <span className="text-[13.5px] text-[color:var(--muted)]">
          Une série de grilles jouées dans l&apos;ordre par toutes les équipes. Bonus : {bonus.line} pts par ligne, {bonus.full} pts par grille (réglés dans
          « Défi »).
        </span>
      </div>
      <Flash params={params} />

      {!hasChallenge ? (
        <KyleEmpty>Active un défi pour configurer les grilles.</KyleEmpty>
      ) : (
        <>
          <Card>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ordre</th>
                  <th>Grille</th>
                  <th>Taille</th>
                  {teams.map((t) => (
                    <th key={t.id}>{t.name}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {grids.map((g, i) => (
                  <tr key={g.id}>
                    <td className="num">{g.order}</td>
                    <td>
                      <strong>{g.title}</strong>
                    </td>
                    <td className="num">
                      {g.size} × {g.size}
                    </td>
                    {g.teams.map((t) => (
                      <td key={t.teamId}>
                        {t.completed ? <Pill tone="ok">terminée</Pill> : t.cells ? <MiniGrid cells={t.cells} size={g.size} /> : <Pill tone="type">pas ouverte</Pill>}
                      </td>
                    ))}
                    <td className="whitespace-nowrap">
                      <form action={moveGridAction} className="inline">
                        <input type="hidden" name="gridId" value={g.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button disabled={i === 0} className="disabled:opacity-30" title="Monter">
                          ↑
                        </button>
                      </form>{" "}
                      <form action={moveGridAction} className="inline">
                        <input type="hidden" name="gridId" value={g.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button disabled={i === grids.length - 1} className="disabled:opacity-30" title="Descendre">
                          ↓
                        </button>
                      </form>{" "}
                      ·{" "}
                      <Link href={`${base}?edit=${g.id}`} className="underline">
                        Modifier
                      </Link>{" "}
                      ·{" "}
                      <form action={deleteGridAction} className="inline">
                        <input type="hidden" name="gridId" value={g.id} />
                        <button className="text-[color:var(--brick)] underline">Supprimer</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {editing ? (
            <GridForm grid={editing} action={saveGridAction} closeHref={base} number={editing.order} />
          ) : (
            <GridForm grid={null} action={saveGridAction} number={grids.length + 1} />
          )}

          <section className="flex flex-col gap-4">
            <div className="topline">
              <h2>Grilles des équipes</h2>
              <span className="text-[13.5px] text-[color:var(--muted)]">
                Clique une case pour retirer une lecture mal posée ou en poser une à la place de l&apos;équipe. Les lignes et les bonus sont recalculés.
              </span>
            </div>

            <Card>
              <form method="get" action={base} className="flex flex-wrap items-end gap-4">
                <label className="field max-w-xs flex-1">
                  Équipe
                  <select name="team" defaultValue={teamBoard?.teamId ?? ""}>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn small">Afficher la grille</button>
              </form>
            </Card>

            {!teamBoard ? (
              <KyleEmpty>Crée une équipe pour suivre son bingo.</KyleEmpty>
            ) : teamBoard.grid ? (
              <BingoBoard
                title={teamBoard.grid.title}
                size={teamBoard.grid.size}
                cells={teamBoard.grid.cells}
                books={teamBoard.books}
                completedLines={teamBoard.grid.completedLines}
                order={teamBoard.grid.order}
                total={teamBoard.total}
                heading={
                  <div>
                    <Eyebrow>{teamBoard.teamName}</Eyebrow>
                    <p className="text-[13px] text-[color:var(--muted)]">
                      Grille {teamBoard.grid.order} sur {teamBoard.total} · «&nbsp;{teamBoard.grid.title}&nbsp;» ·{" "}
                      {teamBoard.grid.cells.filter((c) => c.complete).length}/{teamBoard.grid.size * teamBoard.grid.size} ·{" "}
                      {teamBoard.grid.completedLines} ligne{teamBoard.grid.completedLines > 1 ? "s" : ""}
                    </p>
                  </div>
                }
                hint="Un roman valide la case : le ½ déjà posé revient en attente. Un graphique = ½ case. ✓ = déjà placé ailleurs (il sera déplacé). En tant qu'admin tu peux poser n'importe quelle lecture de l'équipe."
                placeBookAction={placeTeamBookAction}
                removeBookAction={removeTeamBookAction}
              />
            ) : (
              <KyleEmpty>
                {teamBoard.total === 0 ? "Aucune grille n'est encore prête." : `${teamBoard.teamName} a terminé les ${teamBoard.total} grilles 🏆`}
              </KyleEmpty>
            )}

            {teamBoard && teamBoard.history.length > 0 && (
              <div className="flex flex-col gap-1">
                <Eyebrow>Grilles terminées</Eyebrow>
                {teamBoard.history.map((h) => (
                  <p key={h.id} className="text-[13px] text-[color:var(--muted)]">
                    ✅ Grille {h.order} — «&nbsp;{h.title}&nbsp;»{h.completedAt ? ` · terminée le ${dateFmt.format(h.completedAt)}` : ""}
                  </p>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
