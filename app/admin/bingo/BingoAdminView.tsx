import Link from "next/link";
import { Card, KyleEmpty, Pill } from "@/components/ui";
import { Flash } from "@/components/Flash";
import type { ActionState } from "@/lib/forms";
import { GridForm, type GridValues } from "./GridForm";

export type GridProgress = "done" | "half" | "free";

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
  demo?: boolean;
  saveGridAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  moveGridAction: (formData: FormData) => Promise<void>;
  deleteGridAction: (formData: FormData) => Promise<void>;
};

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
  demo,
  saveGridAction,
  moveGridAction,
  deleteGridAction,
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
        </>
      )}
    </>
  );
}
