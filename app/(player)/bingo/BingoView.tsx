import { KyleEmpty, PageTitle, SectionHeading } from "@/components/ui";
import { CheckIcon } from "@/components/ui/icons";
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
  const okText = Array.isArray(params.ok) ? params.ok[0] : params.ok;
  const justValidated = okText?.match(/case ([A-Z]\d+) validée/)?.[1] ?? null;
  if (!hasTeam) {
    return (
      <main className="flex flex-1 flex-col gap-5 p-5">
        <PageTitle>Bingo</PageTitle>
        <KyleEmpty>Rejoins une équipe pour jouer au bingo.</KyleEmpty>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-5 p-5">
      <Flash params={params} />
      {grid ? (
        <BingoBoard
          justValidated={justValidated}
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
          <PageTitle>Bingo d’équipe</PageTitle>
          <KyleEmpty>{total === 0 ? "La première grille n’est pas encore prête." : `Les ${total} grilles sont terminées.`}</KyleEmpty>
        </>
      )}

      {history.length > 0 && (
        <section className="section">
          <SectionHeading>Grilles terminées</SectionHeading>
          {history.map((h) => (
            <p key={h.id} className="card flat flex items-center gap-2.5 px-4 py-3 text-[14px]">
              <CheckIcon className="ico text-[color:var(--olive-ink)]" />
              <span>
                <strong>Grille {h.order}</strong> — <span className="accent">« {h.title} »</span>
                {h.completedAt ? ` · terminée le ${dateFmt.format(h.completedAt)}` : ""}
              </span>
            </p>
          ))}
        </section>
      )}

      <p className="meta-xs">
        Un roman valide une case ; deux graphiques (d’un ou deux membres de l’équipe) aussi. Une case avec une seule moitié est « en attente » et ne rapporte
        rien. Ligne, colonne ou diagonale complète : {bonus.line} pts ; grille entière : {bonus.full} pts, puis la grille suivante s’ouvre.
      </p>
    </main>
  );
}
