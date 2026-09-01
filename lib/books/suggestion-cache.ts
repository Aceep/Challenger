/**
 * The autocomplete's memory — the *pure* half of « ne redemande pas ce qu'on
 * vient de demander ».
 *
 * OpenLibrary answers a title search in a couple of seconds, sometimes ten. Yet
 * the same query comes back constantly: a reader backspaces one letter and
 * retypes it, hesitates between two books and walks back up to the first,
 * closes the sheet and opens it again. Every one of those is a query already
 * answered, and answering it from memory costs nothing.
 *
 * A small LRU, held for the life of the page — no I/O here, so it is
 * unit-tested; the component keeps one in a ref.
 */

import type { BookSuggestion } from "./openlibrary";

/**
 * How many answers are kept. A reader types a handful of titles per session,
 * each one leaving a query per pause in the typing: fifty covers a whole
 * evening of entering readings, and holds a few tens of kilobytes at most.
 */
export const CACHE_MAX = 50;

/**
 * The key of a query. Case is folded — OpenLibrary is case-blind, and « Harry »
 * typed after « harry » must find the answer already there — and runs of spaces
 * are collapsed, the trailing one included, since the field is trimmed before
 * being sent.
 *
 * Accents are **not** folded, unlike the highlight: « asterix » and « astérix »
 * are two different questions to OpenLibrary, and they get two different
 * answers. Folding them together would show the wrong list.
 */
export function cacheKey(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export type SuggestionCache = {
  /** The answer remembered for this query, or undefined. Re-marks it as the freshest. */
  get(query: string): BookSuggestion[] | undefined;
  /** Remembers an answer. An empty one is dropped — see below. */
  set(query: string, items: BookSuggestion[]): void;
  /** How many answers are held — the tests read it, nothing else. */
  readonly size: number;
};

/**
 * A new cache, empty.
 *
 * **An empty answer is never kept.** The route says nothing about *why* a list
 * is empty: a search that genuinely found no book and a search OpenLibrary
 * failed to answer — a timeout, a 503 — both come back as `[]`, on purpose, so
 * that typing by hand always stays possible. Remembering that emptiness would
 * turn a passing hiccup into a permanent « Aucun livre trouvé » for the rest of
 * the session, the retry silently answered from memory. So only an answer with
 * books in it is remembered; the rare genuinely-empty query is asked again,
 * which is the cheap mistake to make.
 */
export function createSuggestionCache(max = CACHE_MAX): SuggestionCache {
  // Insertion order *is* the recency order: a hit is deleted and set again, so
  // the oldest key is always the first one `keys()` hands back.
  const entries = new Map<string, BookSuggestion[]>();

  return {
    get(query) {
      const key = cacheKey(query);
      const items = entries.get(key);
      if (!items) return undefined;
      entries.delete(key);
      entries.set(key, items);
      return items;
    },
    set(query, items) {
      if (items.length === 0) return;
      const key = cacheKey(query);
      entries.delete(key);
      entries.set(key, items);
      while (entries.size > max) {
        const oldest = entries.keys().next();
        if (oldest.done) break;
        entries.delete(oldest.value);
      }
    },
    get size() {
      return entries.size;
    },
  };
}
