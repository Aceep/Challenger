import { describe, expect, it } from "vitest";
import { coverUrlFor, isAllowedCoverUrl, mapSearchDocs, type OpenLibraryDoc } from "./openlibrary";

const doc = (o: Partial<OpenLibraryDoc>): OpenLibraryDoc => ({ title: "Les Furtifs", author_name: ["Alain Damasio"], ...o });

describe("coverUrlFor", () => {
  it("builds the medium cover of a cover id", () => {
    expect(coverUrlFor(10675378)).toBe("https://covers.openlibrary.org/b/id/10675378-M.jpg");
  });
  it("has no cover without a usable id", () => {
    expect(coverUrlFor(undefined)).toBeNull();
    expect(coverUrlFor(null)).toBeNull();
    expect(coverUrlFor(0)).toBeNull();
    expect(coverUrlFor(-3)).toBeNull();
    expect(coverUrlFor(1.5)).toBeNull();
  });
});

describe("mapSearchDocs", () => {
  it("maps title, first author, median pages and cover", () => {
    expect(mapSearchDocs([doc({ number_of_pages_median: 816, cover_i: 10675378, key: "/works/OL24217581W" })])).toEqual([
      { title: "Les Furtifs", author: "Alain Damasio", pages: 816, coverUrl: "https://covers.openlibrary.org/b/id/10675378-M.jpg" },
    ]);
  });

  it("keeps only the first author credited, ignoring the empty ones", () => {
    expect(mapSearchDocs([doc({ author_name: ["  ", "Marjane Satrapi", "Autre"] })])[0].author).toBe("Marjane Satrapi");
    expect(mapSearchDocs([doc({ author_name: [] })])[0].author).toBeNull();
    expect(mapSearchDocs([doc({ author_name: undefined })])[0].author).toBeNull();
  });

  it("leaves pages and cover empty when OpenLibrary does not know them", () => {
    expect(mapSearchDocs([doc({})])[0]).toEqual({ title: "Les Furtifs", author: "Alain Damasio", pages: null, coverUrl: null });
  });

  it("rounds a median page count and refuses an absurd one", () => {
    expect(mapSearchDocs([doc({ number_of_pages_median: 148.5 })])[0].pages).toBe(149);
    expect(mapSearchDocs([doc({ number_of_pages_median: 0 })])[0].pages).toBeNull();
    expect(mapSearchDocs([doc({ number_of_pages_median: -12 })])[0].pages).toBeNull();
  });

  it("drops the documents without a title and trims the others", () => {
    const out = mapSearchDocs([doc({ title: "" }), doc({ title: "   " }), doc({ title: null }), doc({ title: "  Persepolis  ", author_name: ["Satrapi"] })]);
    expect(out).toEqual([{ title: "Persepolis", author: "Satrapi", pages: null, coverUrl: null }]);
  });

  it("dedupes on title + author, accents and case aside, and keeps the first (most relevant)", () => {
    const out = mapSearchDocs([
      doc({ title: "Les Furtifs", cover_i: 1 }),
      doc({ title: "LES FURTIFS", cover_i: 2 }),
      doc({ title: "Les  Fürtifs ", author_name: ["ALAIN DAMASIO"], cover_i: 3 }),
      doc({ title: "Les Furtifs", author_name: ["Quelqu’un d’autre"], cover_i: 4 }),
    ]);
    expect(out.map((s) => s.coverUrl)).toEqual([coverUrlFor(1), coverUrlFor(4)]);
  });

  it("never returns more than the limit, and copes with an empty answer", () => {
    const many = Array.from({ length: 20 }, (_, i) => doc({ title: `Livre ${i}` }));
    expect(mapSearchDocs(many)).toHaveLength(8);
    expect(mapSearchDocs(many, 3)).toHaveLength(3);
    expect(mapSearchDocs([])).toEqual([]);
    expect(mapSearchDocs(null)).toEqual([]);
    expect(mapSearchDocs(undefined)).toEqual([]);
  });
});

describe("isAllowedCoverUrl", () => {
  it("accepts a cover of covers.openlibrary.org", () => {
    expect(isAllowedCoverUrl("https://covers.openlibrary.org/b/id/10675378-M.jpg")).toBe(true);
  });
  it("refuses any other origin", () => {
    expect(isAllowedCoverUrl("http://covers.openlibrary.org/b/id/1-M.jpg")).toBe(false);
    expect(isAllowedCoverUrl("https://covers.openlibrary.org.example.com/b/id/1-M.jpg")).toBe(false);
    expect(isAllowedCoverUrl("https://openlibrary.org/b/id/1-M.jpg")).toBe(false);
    expect(isAllowedCoverUrl("https://exemple.test/couverture.jpg")).toBe(false);
    expect(isAllowedCoverUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedCoverUrl("data:image/png;base64,AAAA")).toBe(false);
  });
  it("refuses what is not a reasonable string", () => {
    expect(isAllowedCoverUrl("")).toBe(false);
    expect(isAllowedCoverUrl(null)).toBe(false);
    expect(isAllowedCoverUrl(undefined)).toBe(false);
    expect(isAllowedCoverUrl(42)).toBe(false);
    expect(isAllowedCoverUrl(`https://covers.openlibrary.org/${"x".repeat(600)}`)).toBe(false);
  });
});
