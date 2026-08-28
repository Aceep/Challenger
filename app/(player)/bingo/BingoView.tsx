import { Eyebrow, KyleEmpty } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { BingoBoard, type BoardCell } from "./BingoBoard";

export type BingoViewProps = {
  grid: { id: string; order: number; title: string; size: number; cells: BoardCell[]; completedLines: number } | null;
  total: number;
  history: { id: string; order: number; title: string; completedAt: Date | null }[];
  books: { id: string; title: string; type: "ROMAN" | "GRAPHIQUE"; owner: string; placedOn: string | null }[];
  bonus: { line: number; full: number };
  hasTeam: boolean;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  placeBookAction: (formData: FormData) => Promise<void>;
  removeBookAction: (formData: FormData) => Promise<void>;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/** Bingo screen — pure view, reused by /demo. */
export function BingoView({ grid, total, history, books, bonus, hasTeam, params, placeBookAction, removeBookAction }: BingoViewProps) {
  if (!hasTeam) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-5">
        <h1>Bingo</h1>
        <KyleEmpty>Rejoins une équipe pour jouer au bingo.</KyleEmpty>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-5 p-5">
      <Flash params={params} />
      {grid ? (
        <BingoBoard
          title={grid.title}
          size={grid.size}
          cells={grid.cells}
          books={books}
          completedLines={grid.completedLines}
          order={grid.order}
          total={total}
          placeBookAction={placeBookAction}
          removeBookAction={removeBookAction}
        />
      ) : (
        <>
          <h1>Bingo d&apos;équipe</h1>
          <KyleEmpty>{total === 0 ? "La première grille n'est pas encore prête." : `Les ${total} grilles sont terminées 🏆`}</KyleEmpty>
        </>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-1">
          <Eyebrow>Grilles terminées</Eyebrow>
          {history.map((h) => (
            <p key={h.id} className="text-[13px] text-[color:var(--muted)]">
              ✅ Grille {h.order} — « {h.title} »{h.completedAt ? ` · terminée le ${dateFmt.format(h.completedAt)}` : ""}
            </p>
          ))}
        </section>
      )}

      <p className="text-xs text-[color:var(--muted)]">
        Un roman valide une case ; deux graphiques (d&apos;un ou deux membres de l&apos;équipe) aussi. Une case avec une seule moitié est « en attente » et ne
        rapporte rien. Ligne, colonne ou diagonale complète : {bonus.line} pts ; grille entière : {bonus.full} pts, puis la grille suivante s&apos;ouvre.
      </p>
    </main>
  );
}
