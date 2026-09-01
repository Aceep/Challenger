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
 *   OpenLibrary for the French edition of each work (`lang=fr` + `editions`)
 *   and `mapSearchDocs` keeps the list French — a work known to exist in other
 *   languages only is left out. `buildSearchQuery` turns the half-typed last
 *   word into a prefix, so « le petit pri » already shows « Le petit prince ».
 *
 * **On waiting.** OpenLibrary is slow and wildly irregular: measured from here,
 * a title search of the shape sent below takes 2,8 s in the median and more
 * than 9 s once in ten. Nothing in the query can be trimmed to fix that — what
 * costs is the `editions` block and the prefix star, and both are what make the
 * list French and the half-typed word findable. So the wait is not shortened,
 * it is *paid once*: every answer is kept in Next's Data Cache, shared by every
 * reader, and the combobox keeps on the page what it has already been shown.
 */

const SEARCH_URL = "https://openlibrary.org/search.json";
/** The edition record of an ISBN — the only place OpenLibrary states *its* page count. */
const editionUrl = (isbn: string) => `https://openlibrary.org/isbn/${isbn}.json`;
/**
 * The work, then its best edition in the language asked for: the `editions`
 * block is what turns « The Hobbit » into « Bilbo le Hobbit », and it carries
 * the languages `mapSearchDocs` keeps the list French with.
 *
 * It is also, measurably, the expensive half of the query: asking without it
 * answers in 1,8 s instead of 3,3 s (median of forty searches each,
 * interleaved). That second and a half is the price of a French list, and it is
 * paid knowingly — so the sub-fields are **named** rather than asked for as
 * `editions.*`, which brings back 14 kB per search instead of 3 kB for the four
 * values actually read. Note that Solr never fills `editions.number_of_pages`;
 * it is asked for because it costs nothing and the day it arrives, the page
 * count of the French printing beats the median of all of them.
 */
const FIELDS =
  "title,author_name,number_of_pages_median,cover_i,key,language,first_publish_year,editions,editions.title,editions.cover_i,editions.number_of_pages,editions.language";
/** ISO 639-1, two letters — « fre » is silently ignored and searches every language. */
const LANG = "fr";
/** OpenLibrary asks that every client identifies itself and says where to complain. */
const userAgent = () => `Challenger-AceepKyle/1.0 (+${APP_URL()})`;
/**
 * How long OpenLibrary is given.
 *
 * Measured over sixty title searches of the shape this route sends: 2,8 s
 * median, but a very long tail — 5,2 s at the third quartile, 9,8 s at the
 * ninth decile. **Thirty percent of them took more than five seconds**, so the
 * old five-second cap was not trimming a tail, it was cutting off nearly a
 * third of the answers and turning them into « Aucun livre trouvé » — a search
 * that looks broken rather than slow, and the very thing that makes one retype
 * the whole title. At eight seconds, thirteen percent are still cut; going
 * further would buy little (ten percent at ten seconds) and eats into the time
 * Vercel gives a function to answer at all.
 *
 * Eight seconds is also less often paid than it looks: the cache below means a
 * given query is waited for once, for everybody.
 */
const TIMEOUT_MS = 8000;
/**
 * How long an answer from OpenLibrary is kept (Next's Data Cache, keyed by URL
 * and shared by every reader of the platform).
 *
 * The catalogue of a book that came out in 1943 does not move in an hour, and
 * everyone typing « harry pot » asks the exact same question — the first one
 * waits the three seconds, the others get the list at once. A failed call is
 * never cached: Next only keeps a 200, so a 503 or a timeout is retried rather
 * than an empty list being served for the hour.
 */
const SEARCH_TTL = 3600;
/**
 * An edition record — the printing behind an ISBN — is even more settled than a
 * search: its title, its page count and its cover are what they were the day it
 * was printed. A day.
 */
const EDITION_TTL = 86400;
/** Below two characters every query matches: not worth a round trip. */
const MIN_QUERY = 2;

const empty = () => NextResponse.json([] as BookSuggestion[]);

/** One call to OpenLibrary; null on anything that is not a readable answer. */
async function askOpenLibrary(url: string | URL, revalidate: number): Promise<unknown> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate },
    });
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
  const body = (await askOpenLibrary(url, SEARCH_TTL)) as { docs?: OpenLibraryDoc[] } | null;
  return Array.isArray(body?.docs) ? body.docs : [];
}

/**
 * The single line of an ISBN. Both answers are asked at once: the edition
 * record (title, pages, cover of *that* printing) and the search document (the
 * author, the year the work first came out), which `isbnSuggestion` merges.
 */
async function isbnLine(isbn: string): Promise<BookSuggestion[]> {
  const [book, docs] = await Promise.all([askOpenLibrary(editionUrl(isbn), EDITION_TTL), searchDocs(`isbn:${isbn}`, 1)]);
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
  // As many documents as the list can show, no more: with the `editions` block
  // asked for, the round trip grows with the limit (2,4 s at four documents,
  // 3,3 s at eight, and a measured 8 s at twenty). Asking for margin against
  // the French filter would cost more than the lines it would win back.
  return NextResponse.json(mapSearchDocs(await searchDocs(q, MAX_SUGGESTIONS)));
}
