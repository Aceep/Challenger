import { NextResponse } from "next/server";
import { mapSearchDocs, MAX_SUGGESTIONS, type BookSuggestion, type OpenLibraryDoc } from "@/lib/books/openlibrary";
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
 * The site is French: the search asks OpenLibrary for the French edition of
 * each work (`lang=fr` + `editions.*`), and `mapSearchDocs` keeps that list
 * French — a work known to exist in other languages only is left out.
 */

const SEARCH_URL = "https://openlibrary.org/search.json";
/**
 * The work, then its best edition in the language asked for: `editions.*` is
 * what turns « The Hobbit » into « Bilbo le Hobbit ».
 */
const FIELDS = "title,author_name,number_of_pages_median,cover_i,key,language,editions,editions.title,editions.cover_i,editions.number_of_pages,editions.language";
/** ISO 639-1, two letters — « fre » is silently ignored and searches every language. */
const LANG = "fr";
/** OpenLibrary asks that every client identifies itself and says where to complain. */
const userAgent = () => `Challenger-AceepKyle/1.0 (+${APP_URL()})`;
const TIMEOUT_MS = 5000;
/** Below two characters every query matches: not worth a round trip. */
const MIN_QUERY = 2;

const empty = () => NextResponse.json([] as BookSuggestion[]);

export async function GET(request: Request) {
  await requireUser();
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < MIN_QUERY) return empty();

  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(MAX_SUGGESTIONS));
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("lang", LANG);

  try {
    const res = await fetch(url, { headers: { "User-Agent": userAgent(), Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return empty();
    const body: unknown = await res.json();
    const docs = (body as { docs?: OpenLibraryDoc[] } | null)?.docs;
    return NextResponse.json(mapSearchDocs(Array.isArray(docs) ? docs : []));
  } catch {
    return empty();
  }
}
