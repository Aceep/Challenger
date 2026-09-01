import { describe, expect, it } from "vitest";
import { coverUrlFor, isAllowedCoverUrl, mapSearchDocs, type OpenLibraryDoc, type OpenLibraryEdition } from "./openlibrary";

const doc = (o: Partial<OpenLibraryDoc>): OpenLibraryDoc => ({ title: "Les Furtifs", author_name: ["Alain Damasio"], ...o });

/** The `editions` block OpenLibrary attaches to a work when asked with `lang=fr`. */
const edition = (o: OpenLibraryEdition): Pick<OpenLibraryDoc, "editions"> => ({ editions: { docs: [o] } });

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

  // Fixtures below are trimmed from real answers of
  // https://openlibrary.org/search.json?lang=fr&fields=…,editions.title,editions.language
  it("shows the French edition of a work — title, cover, pages", () => {
    // « the hobbit » → the work is English, its best French edition is Bilbo.
    const hobbit = doc({
      title: "The Hobbit",
      author_name: ["J.R.R. Tolkien"],
      language: ["eng", "fre", "ger"],
      number_of_pages_median: 310,
      cover_i: 14627509,
      ...edition({ title: "Bilbo le Hobbit", cover_i: 10584480, number_of_pages: 287, language: ["fre"] }),
    });
    expect(mapSearchDocs([hobbit])).toEqual([
      { title: "Bilbo le Hobbit", author: "J.R.R. Tolkien", pages: 287, coverUrl: coverUrlFor(10584480) },
    ]);
  });

  it("falls back on the work for whatever the edition does not say", () => {
    // OpenLibrary rarely fills `number_of_pages`, and often has no cover of the edition.
    const petitPrince = doc({
      title: "Le Petit Prince",
      author_name: ["Antoine de Saint-Exupéry"],
      number_of_pages_median: 114,
      cover_i: 13890892,
      ...edition({ title: "Le Petit Prince" }),
    });
    expect(mapSearchDocs([petitPrince])).toEqual([
      { title: "Le Petit Prince", author: "Antoine de Saint-Exupéry", pages: 114, coverUrl: coverUrlFor(13890892) },
    ]);
    // An edition with no title of its own is just the work.
    expect(mapSearchDocs([doc({ ...edition({ title: "   ", cover_i: 7 }) })])[0].title).toBe("Les Furtifs");
    // And an absurd edition page count falls back too, rather than passing through.
    expect(mapSearchDocs([doc({ number_of_pages_median: 816, ...edition({ number_of_pages: 0 }) })])[0].pages).toBe(816);
  });

  it("keeps only the French suggestions, in their order of relevance", () => {
    const out = mapSearchDocs([
      doc({ title: "Hoàng tu bé", language: ["vie"], ...edition({ title: "Hoàng tu bé", language: ["vie"] }) }),
      doc({ title: "Den lille Prins", language: ["dan"], ...edition({ title: "Den lille Prins", language: ["dan"] }) }),
      doc({ title: "Le petit prince", language: ["fre", "eng"], ...edition({ title: "Le petit prince", language: ["fre"] }) }),
      doc({ title: "O principezinho", language: ["por"], ...edition({ title: "O Principezinho", language: ["por"] }) }),
      doc({ title: "Pour le petit prince", language: ["fre"], ...edition({ title: "Pour le petit prince.", language: ["fre"] }) }),
    ]);
    expect(out.map((s) => s.title)).toEqual(["Le petit prince", "Pour le petit prince."]);
  });

  it("turns away only what is positively not French", () => {
    // A bilingual edition is French enough; « fre » on the work is enough too.
    const bilingual = doc({ title: "The Little Prince", language: ["eng"], ...edition({ title: "The little prince", language: ["eng", "fre"] }) });
    const frenchWork = doc({ title: "Les Furtifs", language: ["fre"], ...edition({ title: "Les Furtifs" }) });
    const english = doc({ title: "A Little Princess", language: ["eng"], ...edition({ title: "A Little Princess", language: ["eng"] }) });
    expect(mapSearchDocs([english, bilingual, frenchWork]).map((s) => s.title)).toEqual(["The little prince", "Les Furtifs"]);
    // Silence is not a refusal: an unlabelled work — small French books often
    // are — stays in the list.
    expect(mapSearchDocs([doc({ title: "Sans langue", language: null, editions: null })]).map((s) => s.title)).toEqual(["Sans langue"]);
    expect(mapSearchDocs([doc({ title: "Sans langue", language: [], ...edition({ title: "Sans langue" }) })]).map((s) => s.title)).toEqual(["Sans langue"]);
    // An English edition of a work published in French too is kept: OpenLibrary
    // knows the book exists here, and `lang=fr` already asked for its edition.
    expect(mapSearchDocs([doc({ title: "The Hobbit", language: ["eng", "fre"], ...edition({ title: "The Hobbit", language: ["eng"] }) })])).toHaveLength(1);
  });

  it("merges the multilingual twins of a work once they all bear their French title", () => {
    const out = mapSearchDocs([
      // The English work, whose French edition bears the very title of the French work.
      doc({ title: "The Little Prince", author_name: ["Antoine de Saint-Exupéry"], language: ["eng"], ...edition({ title: "Le petit prince", cover_i: 1, language: ["fre"] }) }),
      doc({ title: "Le petit prince", author_name: ["Antoine de Saint-Exupéry"], language: ["fre"], ...edition({ title: "LE PETIT PRINCE", cover_i: 2, language: ["fre"] }) }),
    ]);
    expect(out).toEqual([{ title: "Le petit prince", author: "Antoine de Saint-Exupéry", pages: null, coverUrl: coverUrlFor(1) }]);
  });

  it("counts the limit on the French suggestions left, once deduped", () => {
    const docs = [
      doc({ title: "Roman anglais", language: ["eng"] }),
      ...Array.from({ length: 5 }, (_, i) => doc({ title: `Roman ${i}`, language: ["fre"] })),
      doc({ title: "ROMAN 0", language: ["fre"] }),
    ];
    expect(mapSearchDocs(docs, 3).map((s) => s.title)).toEqual(["Roman 0", "Roman 1", "Roman 2"]);
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
