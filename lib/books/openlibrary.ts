/**
 * OpenLibrary — the *pure* half of the book autocomplete: the shape of a search
 * document, and how it becomes a suggestion of the form. No I/O here (the fetch
 * lives in `app/api/books/search/route.ts`), so everything below is unit-tested.
 *
 * Covers are served by `covers.openlibrary.org`, and only from there:
 * `isAllowedCoverUrl` is the single gate, used by the service before storing a
 * `Book.coverUrl` and by the Discord card before putting it in an embed.
 */

/** One document of https://openlibrary.org/search.json, limited to the fields we ask for. */
export type OpenLibraryDoc = {
  title?: string | null;
  author_name?: string[] | null;
  number_of_pages_median?: number | null;
  cover_i?: number | null;
  /** Work key, « /works/OL17267881W ». */
  key?: string | null;
};

/** One line of the title autocomplete — exactly what the form prefills. */
export type BookSuggestion = {
  title: string;
  author: string | null;
  pages: number | null;
  coverUrl: string | null;
};

/** The only host a cover may come from. */
export const COVER_PREFIX = "https://covers.openlibrary.org/";

/** A stored URL never exceeds this — a guard, not a rule of the API. */
const MAX_URL_LENGTH = 500;

/** How many suggestions the form shows at most. */
export const MAX_SUGGESTIONS = 8;

/** Medium cover (~180 px wide) of an OpenLibrary cover id; null when the work has none. */
export function coverUrlFor(coverId: number | null | undefined): string | null {
  return typeof coverId === "number" && Number.isInteger(coverId) && coverId > 0 ? `${COVER_PREFIX}b/id/${coverId}-M.jpg` : null;
}

/**
 * True only for a cover URL of `covers.openlibrary.org`. Anything else — another
 * host, a `data:` URI, a host that merely *starts* like it
 * (`covers.openlibrary.org.example.com`) — is refused, the trailing slash of the
 * prefix closing the authority.
 */
export function isAllowedCoverUrl(url: unknown): url is string {
  return typeof url === "string" && url.length <= MAX_URL_LENGTH && url.startsWith(COVER_PREFIX);
}

/** Lowercase, accent-free key used to spot two editions of the same book. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const firstAuthor = (names: string[] | null | undefined): string | null => names?.map((n) => n.trim()).find(Boolean) ?? null;

const pageCount = (n: number | null | undefined): number | null => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : null);

/**
 * Search documents → suggestions: a title is required, the author is the first
 * one credited, the page count comes from the median edition, and two documents
 * sharing a title and an author are one suggestion (the first wins, OpenLibrary
 * sorts by relevance).
 */
export function mapSearchDocs(docs: readonly OpenLibraryDoc[] | null | undefined, limit = MAX_SUGGESTIONS): BookSuggestion[] {
  const seen = new Set<string>();
  const out: BookSuggestion[] = [];
  for (const doc of docs ?? []) {
    if (out.length >= limit) break;
    const title = doc?.title?.trim();
    if (!title) continue;
    const author = firstAuthor(doc.author_name);
    const key = `${norm(title)}|${author ? norm(author) : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, author, pages: pageCount(doc.number_of_pages_median), coverUrl: coverUrlFor(doc.cover_i) });
  }
  return out;
}
