import { describe, expect, it } from "vitest";
import type { BookSuggestion } from "./openlibrary";
import { cacheKey, createSuggestionCache } from "./suggestion-cache";

const book = (title: string): BookSuggestion[] => [{ title, author: null, pages: null, coverUrl: null, year: null, isbn: null }];

const titleOf = (items: BookSuggestion[] | undefined) => items?.[0]?.title;

describe("cacheKey", () => {
  it("ignores case, so « Harry » finds what « harry » asked", () => {
    expect(cacheKey("Harry Potter")).toBe(cacheKey("harry potter"));
  });

  it("ignores the spaces around and between the words", () => {
    expect(cacheKey("  le   petit  pri ")).toBe("le petit pri");
  });

  it("keeps the accents apart — they are two questions with two answers", () => {
    expect(cacheKey("astérix")).not.toBe(cacheKey("asterix"));
  });
});

describe("createSuggestionCache", () => {
  it("gives back what was put in", () => {
    const cache = createSuggestionCache();
    cache.set("le petit pri", book("Le petit prince"));
    expect(titleOf(cache.get("le petit pri"))).toBe("Le petit prince");
  });

  it("knows nothing of a query never asked", () => {
    expect(createSuggestionCache().get("les fourmis")).toBeUndefined();
  });

  it("answers a query typed with another case or spacing", () => {
    const cache = createSuggestionCache();
    cache.set("Les Fourmis", book("Les fourmis"));
    expect(titleOf(cache.get("  les   fourmis  "))).toBe("Les fourmis");
  });

  it("never remembers an empty answer — a hiccup must not become a lasting « aucun livre »", () => {
    const cache = createSuggestionCache();
    cache.set("zzzz", []);
    expect(cache.get("zzzz")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("replaces the answer of a query asked twice", () => {
    const cache = createSuggestionCache();
    cache.set("dune", book("Dune"));
    cache.set("dune", book("Dune, tome 2"));
    expect(titleOf(cache.get("dune"))).toBe("Dune, tome 2");
    expect(cache.size).toBe(1);
  });

  it("holds no more than its cap, dropping the oldest first", () => {
    const cache = createSuggestionCache(3);
    for (const q of ["a", "b", "c", "d"]) cache.set(q, book(q));
    expect(cache.size).toBe(3);
    expect(cache.get("a")).toBeUndefined();
    expect(titleOf(cache.get("d"))).toBe("d");
  });

  it("keeps what was read recently — a hit makes an entry the freshest", () => {
    const cache = createSuggestionCache(3);
    for (const q of ["a", "b", "c"]) cache.set(q, book(q));
    // « a » is the oldest, until it is read again.
    expect(titleOf(cache.get("a"))).toBe("a");
    cache.set("d", book("d"));
    expect(titleOf(cache.get("a"))).toBe("a");
    expect(cache.get("b")).toBeUndefined();
  });

  it("counts a re-set as a use, so the freshest is never the one dropped", () => {
    const cache = createSuggestionCache(2);
    cache.set("a", book("a"));
    cache.set("b", book("b"));
    cache.set("a", book("a2"));
    cache.set("c", book("c"));
    expect(titleOf(cache.get("a"))).toBe("a2");
    expect(cache.get("b")).toBeUndefined();
  });
});
