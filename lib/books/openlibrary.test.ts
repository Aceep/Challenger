import { describe, expect, it } from "vitest";
import {
  buildSearchQuery,
  coverUrlFor,
  coverUrlForIsbn,
  isAllowedCoverUrl,
  isbnSuggestion,
  mapSearchDocs,
  type OpenLibraryBook,
  type OpenLibraryDoc,
  type OpenLibraryEdition,
} from "./openlibrary";

const doc = (o: Partial<OpenLibraryDoc>): OpenLibraryDoc => ({ title: "Les Furtifs", author_name: ["Alain Damasio"], ...o });

/** The `editions` block OpenLibrary attaches to a work when asked with `lang=fr`. */
const edition = (o: OpenLibraryEdition): Pick<OpenLibraryDoc, "editions"> => ({ editions: { docs: [o] } });

describe("buildSearchQuery", () => {
  it("searches the half-typed last word as a prefix too", () => {
    // The bug this fixes: « le petit pri » found « Le parti pris des choses »,
    // never « Le petit prince ».
    expect(buildSearchQuery("le petit pri")).toBe("le petit (pri OR pri*)");
    expect(buildSearchQuery("bilbo le hob")).toBe("bilbo le (hob OR hob*)");
    expect(buildSearchQuery("fourm")).toBe("(fourm OR fourm*)");
  });

  it("searches the word as itself as well, for the star sees only the raw index", () => {
    // `les fourmis*` alone misses « Les fourmis » — indexed stemmed, as *fourmi*.
    expect(buildSearchQuery("les fourmis")).toBe("les (fourmis OR fourmis*)");
    expect(buildSearchQuery("la horde du contrevent")).toBe("la horde du (contrevent OR contrevent*)");
  });

  it("leaves a finished word alone — a trailing space says so", () => {
    expect(buildSearchQuery("le petit ")).toBe("le petit");
    expect(buildSearchQuery("  les fourmis\t")).toBe("les fourmis");
  });

  it("keeps the elided head out of the prefix", () => {
    // « d'azk* » would miss « d’Azkaban », indexed un-elided as *azkaban*.
    expect(buildSearchQuery("harry potter et le prisonnier d'azk")).toBe("harry potter et le prisonnier d'(azk OR azk*)");
    expect(buildSearchQuery("l’étrang")).toBe("l’(étrang OR étrang*)");
    // Only the last apostrophe divides, and an empty tail is no prefix at all.
    expect(buildSearchQuery("aujourd'hui")).toBe("aujourd'(hui OR hui*)");
    expect(buildSearchQuery("le prisonnier d'")).toBe("le prisonnier d'");
  });

  it("stars nothing under three letters, which OpenLibrary answers with a 500", () => {
    expect(buildSearchQuery("le petit p")).toBe("le petit p");
    expect(buildSearchQuery("le petit pr")).toBe("le petit pr");
    expect(buildSearchQuery("le petit pri")).toBe("le petit (pri OR pri*)");
    expect(buildSearchQuery("d'az")).toBe("d'az");
  });

  it("neutralises the Solr syntax, which typed by hand means something else", () => {
    // « - » reads as a NOT and finds nothing; the others break the query outright.
    expect(buildSearchQuery("saint-exupéry")).toBe("saint (exupéry OR exupéry*)");
    expect(buildSearchQuery("1984 : le roman")).toBe("1984 le (roman OR roman*)");
    expect(buildSearchQuery("harry potter (2)")).toBe("harry potter 2");
    expect(buildSearchQuery("le petit pri*")).toBe("le petit pri");
    expect(buildSearchQuery("le petit pri~")).toBe("le petit pri");
    expect(buildSearchQuery("sang-mêlé")).toBe("sang (mêlé OR mêlé*)");
  });

  it("asks nothing when nothing searchable is left", () => {
    expect(buildSearchQuery("")).toBe("");
    expect(buildSearchQuery("   ")).toBe("");
    expect(buildSearchQuery("+*?[]{}")).toBe("");
  });
});

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
  it("maps title, first author, median pages, cover and year of first publication", () => {
    expect(mapSearchDocs([doc({ number_of_pages_median: 816, cover_i: 10675378, key: "/works/OL24217581W", first_publish_year: 2019 })])).toEqual([
      { title: "Les Furtifs", author: "Alain Damasio", pages: 816, coverUrl: "https://covers.openlibrary.org/b/id/10675378-M.jpg", year: 2019, isbn: null },
    ]);
    // The year is the work's, and OpenLibrary does not always know it.
    expect(mapSearchDocs([doc({ first_publish_year: null })])[0].year).toBeNull();
    expect(mapSearchDocs([doc({ first_publish_year: 0 })])[0].year).toBeNull();
  });

  it("keeps only the first author credited, ignoring the empty ones", () => {
    expect(mapSearchDocs([doc({ author_name: ["  ", "Marjane Satrapi", "Autre"] })])[0].author).toBe("Marjane Satrapi");
    expect(mapSearchDocs([doc({ author_name: [] })])[0].author).toBeNull();
    expect(mapSearchDocs([doc({ author_name: undefined })])[0].author).toBeNull();
  });

  it("leaves pages and cover empty when OpenLibrary does not know them", () => {
    expect(mapSearchDocs([doc({})])[0]).toEqual({ title: "Les Furtifs", author: "Alain Damasio", pages: null, coverUrl: null, year: null, isbn: null });
  });

  it("rounds a median page count and refuses an absurd one", () => {
    expect(mapSearchDocs([doc({ number_of_pages_median: 148.5 })])[0].pages).toBe(149);
    expect(mapSearchDocs([doc({ number_of_pages_median: 0 })])[0].pages).toBeNull();
    expect(mapSearchDocs([doc({ number_of_pages_median: -12 })])[0].pages).toBeNull();
  });

  it("drops the documents without a title and trims the others", () => {
    const out = mapSearchDocs([doc({ title: "" }), doc({ title: "   " }), doc({ title: null }), doc({ title: "  Persepolis  ", author_name: ["Satrapi"] })]);
    expect(out).toEqual([{ title: "Persepolis", author: "Satrapi", pages: null, coverUrl: null, year: null, isbn: null }]);
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
      { title: "Bilbo le Hobbit", author: "J.R.R. Tolkien", pages: 287, coverUrl: coverUrlFor(10584480), year: null, isbn: null },
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
      { title: "Le Petit Prince", author: "Antoine de Saint-Exupéry", pages: 114, coverUrl: coverUrlFor(13890892), year: null, isbn: null },
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
    expect(out).toEqual([{ title: "Le petit prince", author: "Antoine de Saint-Exupéry", pages: null, coverUrl: coverUrlFor(1), year: null, isbn: null }]);
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

describe("isbnSuggestion", () => {
  // Fixtures trimmed from the real answers for 978-2-07-061275-8 (« Le petit
  // prince », Folio) — https://openlibrary.org/isbn/9782070612758.json and
  // https://openlibrary.org/search.json?q=isbn:9782070612758.
  const ISBN = "9782070612758";
  const book: OpenLibraryBook = { title: "Le Petit Prince", number_of_pages: 120, covers: [2137711], publish_date: "March 2007" };
  const found: OpenLibraryDoc = {
    title: "Le petit prince",
    author_name: ["Antoine de Saint-Exupéry"],
    first_publish_year: 1943,
    number_of_pages_median: 96,
    cover_i: 10708272,
    editions: { docs: [{ title: "Le Petit Prince", cover_i: 2137711, language: ["fre"] }] },
  };

  it("merges the edition one holds with what the work says", () => {
    // The printing wins on its title, its pages and its cover; the work names
    // the author and dates the first publication.
    expect(isbnSuggestion(ISBN, book, found)).toEqual({
      title: "Le Petit Prince",
      author: "Antoine de Saint-Exupéry",
      pages: 120,
      coverUrl: coverUrlFor(2137711),
      year: 1943,
      isbn: ISBN,
    });
  });

  it("holds up when only one of the two answers came back", () => {
    // Solr never fills `editions.number_of_pages`: without the edition record
    // the count falls back on the work's median.
    expect(isbnSuggestion(ISBN, null, found)).toEqual({
      title: "Le Petit Prince",
      author: "Antoine de Saint-Exupéry",
      pages: 96,
      coverUrl: coverUrlFor(2137711),
      year: 1943,
      isbn: ISBN,
    });
    // No search document: no author, and the year is read off the printing.
    expect(isbnSuggestion(ISBN, book, null)).toEqual({
      title: "Le Petit Prince",
      author: null,
      pages: 120,
      coverUrl: coverUrlFor(2137711),
      year: 2007,
      isbn: ISBN,
    });
    // Nothing at all, or nothing bearing a title: no line rather than a blank one.
    expect(isbnSuggestion(ISBN, null, null)).toBeNull();
    expect(isbnSuggestion(ISBN, { number_of_pages: 120 }, { author_name: ["Anonyme"] })).toBeNull();
  });

  it("falls back on the cover addressed by the ISBN, and only then", () => {
    expect(isbnSuggestion(ISBN, { title: "Le Petit Prince" }, null)?.coverUrl).toBe(coverUrlForIsbn(ISBN));
    expect(coverUrlForIsbn(ISBN)).toBe("https://covers.openlibrary.org/b/isbn/9782070612758-M.jpg");
    expect(isAllowedCoverUrl(coverUrlForIsbn(ISBN))).toBe(true);
    // « -1 » is OpenLibrary's way of saying « no cover ».
    expect(isbnSuggestion(ISBN, { title: "Le Petit Prince", covers: [-1] }, null)?.coverUrl).toBe(coverUrlForIsbn(ISBN));
  });

  it("keeps a book that is not French: the reader is holding it", () => {
    // The language filter of the title search has no business here.
    const hobbit: OpenLibraryDoc = { title: "The Hobbit", author_name: ["J.R.R. Tolkien"], language: ["eng"], first_publish_year: 1937 };
    expect(isbnSuggestion("9780261102217", { title: "The Hobbit", number_of_pages: 389 }, hobbit)).toEqual({
      title: "The Hobbit",
      author: "J.R.R. Tolkien",
      pages: 389,
      coverUrl: coverUrlForIsbn("9780261102217"),
      year: 1937,
      isbn: "9780261102217",
    });
  });

  it("refuses an absurd page count and a date it cannot read", () => {
    expect(isbnSuggestion(ISBN, { title: "Le Petit Prince", number_of_pages: 0 }, found)?.pages).toBe(96);
    expect(isbnSuggestion(ISBN, { title: "Le Petit Prince", publish_date: "sans date" }, null)?.year).toBeNull();
    expect(isbnSuggestion(ISBN, { title: "  Le Petit Prince  " }, null)?.title).toBe("Le Petit Prince");
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
