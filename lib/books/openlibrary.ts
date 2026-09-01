/**
 * OpenLibrary — the *pure* half of the book autocomplete: the shape of a search
 * document, and how it becomes a suggestion of the form. No I/O here (the fetch
 * lives in `app/api/books/search/route.ts`), so everything below is unit-tested.
 *
 * Covers are served by `covers.openlibrary.org`, and only from there:
 * `isAllowedCoverUrl` is the single gate, used by the service before storing a
 * `Book.coverUrl` and by the Discord card before putting it in an embed.
 */

/**
 * One edition of a work, as returned by the `editions` field: asked with
 * `lang=fr`, OpenLibrary hands back the *best edition in French* of each work
 * (« The Hobbit » → « Bilbo le Hobbit »). Everything in it may be missing.
 */
export type OpenLibraryEdition = {
  title?: string | null;
  cover_i?: number | null;
  number_of_pages?: number | null;
  /** MARC codes, « fre », « eng »… A bilingual edition lists several. */
  language?: string[] | null;
};

/** One document of https://openlibrary.org/search.json, limited to the fields we ask for. */
export type OpenLibraryDoc = {
  title?: string | null;
  author_name?: string[] | null;
  number_of_pages_median?: number | null;
  cover_i?: number | null;
  /** Work key, « /works/OL17267881W ». */
  key?: string | null;
  /** Every language the *work* has ever been published in. */
  language?: string[] | null;
  editions?: { docs?: OpenLibraryEdition[] | null } | null;
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

/** MARC code of French, the language of the site — the one the list is kept to. */
const FRENCH = "fre";

const languagesOf = (languages: string[] | null | undefined): string[] => languages?.map((l) => l?.trim().toLowerCase()).filter(Boolean) ?? [];

/**
 * Does this suggestion belong to a French list? Yes when the edition or the work
 * says « fre » — a bilingual « eng, fre » edition counts — and yes as well when
 * neither says anything: many small French books carry no language on
 * OpenLibrary, and only what is *positively* something else is turned away.
 */
function isFrench(doc: OpenLibraryDoc, edition: OpenLibraryEdition | undefined): boolean {
  const languages = [...languagesOf(edition?.language), ...languagesOf(doc.language)];
  return languages.length === 0 || languages.includes(FRENCH);
}

/** One document turned into a line of the list — null when it is not one of ours. */
function toSuggestion(doc: OpenLibraryDoc): BookSuggestion | null {
  const edition = doc?.editions?.docs?.[0] ?? undefined;
  if (!isFrench(doc, edition)) return null;
  // The edition speaks for the work: its title, its cover, its page count, each
  // falling back on the work when OpenLibrary does not know it.
  const title = edition?.title?.trim() || doc?.title?.trim();
  if (!title) return null;
  return {
    title,
    author: firstAuthor(doc.author_name),
    pages: pageCount(edition?.number_of_pages) ?? pageCount(doc.number_of_pages_median),
    coverUrl: coverUrlFor(edition?.cover_i) ?? coverUrlFor(doc.cover_i),
  };
}

/**
 * Search documents → suggestions. A title is required; the author is the first
 * one credited; the French edition of a work replaces it whenever OpenLibrary
 * knows one (`lang=fr` on the route), so a query typed in English still shows
 * the book as it is read here.
 *
 * The list is French, and only French: a work published in other languages
 * only — « Den lille Prins », « The Hobbit companion » — is left out rather
 * than pushed down. Two suggestions sharing a title and an author are one line
 * (the first wins, OpenLibrary sorts by relevance), which is what merges the
 * multilingual twins of a work once they all bear their French title.
 */
export function mapSearchDocs(docs: readonly OpenLibraryDoc[] | null | undefined, limit = MAX_SUGGESTIONS): BookSuggestion[] {
  const seen = new Set<string>();
  const out: BookSuggestion[] = [];
  for (const doc of docs ?? []) {
    if (out.length >= limit) break;
    const suggestion = toSuggestion(doc);
    if (!suggestion) continue;
    const key = `${norm(suggestion.title)}|${suggestion.author ? norm(suggestion.author) : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(suggestion);
  }
  return out;
}
