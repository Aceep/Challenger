import Link from "next/link";
import { BookCover } from "@/components/ui/BookCover";
import { Card, KyleEmpty, Pill } from "@/components/ui";
import { DataTable } from "@/components/ui/DataTable";
import { Flash } from "@/components/Flash";
import { BOOK_TYPE_LABEL, fmtPoints } from "@/lib/format";
import { ReadingEditModal, type AdminReadingEdit } from "./ReadingEditModal";

export type AdminReadingRow = {
  id: string;
  finishedAt: Date;
  teamName: string | null;
  teamColor: string | null;
  owner: string;
  title: string;
  author: string;
  pages: number;
  type: "ROMAN" | "GRAPHIQUE";
  points: number;
  /** OpenLibrary cover, when the reading was declared through the web autocomplete. */
  coverUrl?: string | null;
  questNumber: number | null;
  /** A graphique only counts as ½ of the quest / cell. */
  questHalf: boolean;
  cellLabel: string | null;
  cellHalf: boolean;
  /** « Léa · 12 sept. 14:32 » — who touched the reading last. */
  updatedLabel: string;
  deleted: boolean;
};

export type ReadingsFilters = { teamId: string; userId: string; q: string; deleted: boolean };

export type ReadingsViewProps = {
  readings: AdminReadingRow[];
  teams: { id: string; name: string; color: string }[];
  players: { id: string; name: string }[];
  filters: ReadingsFilters;
  page: number;
  pages: number;
  total: number;
  hasChallenge: boolean;
  /** Reading currently open in the edit modal (`?edit=<id>`). */
  editing: AdminReadingEdit | null;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  updateReadingAction: (formData: FormData) => Promise<void>;
  deleteReadingAction: (formData: FormData) => Promise<void>;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "2-digit" });

/** Filters and page as a query string, so links and actions keep the current view. */
function queryOf(filters: ReadingsFilters, page: number) {
  const p = new URLSearchParams();
  if (filters.teamId) p.set("team", filters.teamId);
  if (filters.userId) p.set("user", filters.userId);
  if (filters.q) p.set("q", filters.q);
  if (filters.deleted) p.set("deleted", "1");
  if (page > 1) p.set("page", String(page));
  return p.toString();
}

/** Admin › Lectures — pure view, reused by /demo/admin. */
export function ReadingsView({
  readings,
  teams,
  players,
  filters,
  page,
  pages,
  total,
  hasChallenge,
  editing,
  params,
  demo,
  updateReadingAction,
  deleteReadingAction,
}: ReadingsViewProps) {
  const base = demo ? "/demo/admin/readings" : "/admin/readings";
  const query = queryOf(filters, page);
  const href = (extra?: string) => `${base}${[query, extra].filter(Boolean).join("&") ? `?${[query, extra].filter(Boolean).join("&")}` : ""}`;
  const pageHref = (n: number) => {
    const q = queryOf(filters, n);
    return q ? `${base}?${q}` : base;
  };

  return (
    <>
      <div className="topline">
        <h1>Lectures</h1>
        <span className="text-[13.5px] text-[color:var(--muted)]">
          Toutes les lectures déclarées sur le défi. En tant qu&apos;admin tu peux les corriger ou les supprimer à tout moment, même hors de la fenêtre du
          dimanche.
        </span>
      </div>
      <Flash params={params} />

      {!hasChallenge ? (
        <KyleEmpty>Active un défi pour voir les lectures.</KyleEmpty>
      ) : (
        <>
          <Card>
            <form method="get" action={base} className="form-grid">
              <label className="field">
                Équipe
                <select name="team" defaultValue={filters.teamId}>
                  <option value="">Toutes les équipes</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Joueur·se
                <select name="user" defaultValue={filters.userId}>
                  <option value="">Tout le monde</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Recherche
                <input name="q" defaultValue={filters.q} placeholder="titre ou auteur·ice" />
              </label>
              <div className="wide flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-[14px] font-bold">
                  <input type="checkbox" name="deleted" value="1" defaultChecked={filters.deleted} className="size-4 accent-[color:var(--kyle-deep)]" />
                  Afficher les lectures supprimées
                </label>
                <button className="btn small">Filtrer</button>
                <Link href={base} className="text-[13px] text-[color:var(--muted)] underline">
                  Réinitialiser
                </Link>
                <span className="ml-auto text-[13px] text-[color:var(--muted)]">
                  {total} lecture{total > 1 ? "s" : ""}
                  {pages > 1 ? ` · page ${page} sur ${pages}` : ""}
                </span>
              </div>
            </form>
          </Card>

          {readings.length === 0 ? (
            <KyleEmpty>Aucune lecture ne correspond à ces filtres.</KyleEmpty>
          ) : (
            <Card>
              <DataTable
                head={[
                  "Terminé le",
                  "Équipe",
                  "Joueur·se",
                  "Lecture",
                  { label: "Pages", className: "text-right" },
                  "Type",
                  { label: "Points", className: "text-right" },
                  "Quête",
                  "Case",
                  "Modifiée par",
                  "",
                ]}
              >
                {readings.map((b) => (
                  <tr key={b.id}>
                    <td className="num whitespace-nowrap">{dateFmt.format(b.finishedAt)}</td>
                    <td className="whitespace-nowrap">
                      {b.teamName ? (
                        <>
                          <span className="dot" style={{ background: b.teamColor ?? "var(--edition)" }} />
                          {b.teamName}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{b.owner}</td>
                    <td>
                      <span className="reading-cell">
                        <BookCover src={b.coverUrl} title={b.title} width={26} />
                        <span>
                          {b.deleted ? (
                            <s>
                              <strong>{b.title}</strong> — {b.author}
                            </s>
                          ) : (
                            <>
                              <strong>{b.title}</strong> — {b.author}
                            </>
                          )}{" "}
                          {b.deleted && <Pill tone="no">supprimée</Pill>}
                        </span>
                      </span>
                    </td>
                    <td className="num text-right">{b.pages}</td>
                    <td>
                      <Pill tone="type">{BOOK_TYPE_LABEL[b.type]}</Pill>
                    </td>
                    <td className="num text-right font-extrabold" style={b.deleted ? { color: "var(--brick)" } : undefined}>
                      {fmtPoints(b.points)}
                    </td>
                    <td className="whitespace-nowrap">{b.questNumber ? `#${b.questNumber}${b.questHalf ? " (½)" : ""}` : "—"}</td>
                    <td className="whitespace-nowrap">{b.cellLabel ? `${b.cellLabel}${b.cellHalf ? " (½)" : ""}` : "—"}</td>
                    <td className="whitespace-nowrap text-[color:var(--muted)]">{b.updatedLabel}</td>
                    <td className="whitespace-nowrap">
                      {b.deleted ? (
                        <span className="text-[color:var(--muted)]">—</span>
                      ) : (
                        <Link href={href(`edit=${b.id}`)} className="underline">
                          Modifier
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </Card>
          )}

          {pages > 1 && (
            <nav className="flex items-center gap-3 text-[14px]" aria-label="Pagination">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="btn small ghost">
                  ← Précédentes
                </Link>
              ) : null}
              <span className="text-[color:var(--muted)]">
                Page {page} sur {pages}
              </span>
              {page < pages ? (
                <Link href={pageHref(page + 1)} className="btn small ghost">
                  Suivantes →
                </Link>
              ) : null}
            </nav>
          )}

          {editing && (
            <ReadingEditModal
              reading={editing}
              closeHref={query ? `${base}?${query}` : base}
              backQuery={query}
              updateReadingAction={updateReadingAction}
              deleteReadingAction={deleteReadingAction}
            />
          )}
        </>
      )}
    </>
  );
}
