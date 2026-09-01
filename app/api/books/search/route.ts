import { NextResponse } from "next/server";
import { detectIsbn } from "@/lib/books/isbn";
import {
  buildSearchQuery,
  isbnSuggestion,
  mapSearchDocs,
  MAX_SUGGESTIONS,
  type BookSuggestion,
  type OpenLibraryBook,
  type OpenLibraryDoc,
} from "@/lib/books/openlibrary";
import { requireUser } from "@/lib/dal";
import { APP_URL } from "@/lib/discord/help";

/**
 * Title autocomplete of the reading form: proxies OpenLibrary so the browser
 * never talks to it directly (one User-Agent, one timeout, no key leaked).
 *
 * Signed-in only, and *never* an error: a network hiccup, a 503 or a malformed
 * answer all come back as an empty list — typing the three fields by hand has
 * to stay possible, always.
 *
 * Two searches behind one field:
 *
 * - **an ISBN** — what is printed on the back of the book being held — asks for
 *   that exact edition and answers with a single line, its « ISBN reconnu »
 *   badge included. No language filter there: the reader has the book.
 * - **anything else** is a title search. The site is French, so it asks
 *   OpenLibrary for the French edition of each work (`lang=fr` + `editions.*`)
 *   and `mapSearchDocs` keeps the list French — a work known to exist in other
 *   languages only is left out. `buildSearchQuery` turns the half-typed last
 *   word into a prefix, so « le petit pri » already shows « Le petit prince ».
 */

const SEARCH_URL = "https://openlibrary.org/search.json";
/** The edition record of an ISBN — the only place OpenLibrary states *its* page count. */
const editionUrl = (isbn: string) => `https://openlibrary.org/isbn/${isbn}.json`;
/**
 * The work, then its best edition in the language asked for: `editions.*` is
 * what turns « The Hobbit » into « Bilbo le Hobbit ».
 */
const FIELDS =
  "title,author_name,number_of_pages_median,cover_i,key,language,first_publish_year,editions,editions.title,editions.cover_i,editions.number_of_pages,editions.language";
/** ISO 639-1, two letters — « fre » is silently ignored and searches every language. */
const LANG = "fr";
/** OpenLibrary asks that every client identifies itself and says where to complain. */
const userAgent = () => `Challenger-AceepKyle/1.0 (+${APP_URL()})`;
const TIMEOUT_MS = 5000;
/** Below two characters every query matches: not worth a round trip. */
const MIN_QUERY = 2;

const empty = () => NextResponse.json([] as BookSuggestion[]);

/** One call to OpenLibrary; null on anything that is not a readable answer. */
async function askOpenLibrary(url: string | URL): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": userAgent(), Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** The documents `search.json` answers `q` with — an empty list when it does not. */
async function searchDocs(q: string, limit: number): Promise<OpenLibraryDoc[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("lang", LANG);
  const body = (await askOpenLibrary(url)) as { docs?: OpenLibraryDoc[] } | null;
  return Array.isArray(body?.docs) ? body.docs : [];
}

/**
 * The single line of an ISBN. Both answers are asked at once: the edition
 * record (title, pages, cover of *that* printing) and the search document (the
 * author, the year the work first came out), which `isbnSuggestion` merges.
 */
async function isbnLine(isbn: string): Promise<BookSuggestion[]> {
  const [book, docs] = await Promise.all([askOpenLibrary(editionUrl(isbn)), searchDocs(`isbn:${isbn}`, 1)]);
  const suggestion = isbnSuggestion(isbn, book as OpenLibraryBook | null, docs[0]);
  return suggestion ? [suggestion] : [];
}

export async function GET(request: Request) {
  await requireUser();
  // Passed on raw, trailing space and all: that space is how `buildSearchQuery`
  // tells a word still being typed from one just finished.
  const typed = new URL(request.url).searchParams.get("q") ?? "";
  if (typed.trim().length < MIN_QUERY) return empty();

  const isbn = detectIsbn(typed);
  if (isbn) return NextResponse.json(await isbnLine(isbn));

  const q = buildSearchQuery(typed);
  // Nothing searchable left — « ??? » was only punctuation.
  if (!q) return empty();
  return NextResponse.json(mapSearchDocs(await searchDocs(q, MAX_SUGGESTIONS)));
}
