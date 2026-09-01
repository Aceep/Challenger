import { describe, expect, it } from "vitest";
import { highlightParts } from "./highlight";

/** « Le **petit pri**nce » — the marked parts, in order, as the eye reads them. */
const marked = (text: string, query: string) =>
  highlightParts(text, query)
    .filter((p) => p.match)
    .map((p) => p.text);

/** The parts glued back together must always be the title itself. */
const whole = (text: string, query: string) =>
  highlightParts(text, query)
    .map((p) => p.text)
    .join("");

describe("highlightParts", () => {
  it("marks what was typed, and welds the words it spans", () => {
    expect(highlightParts("Le petit prince", "le petit pri")).toEqual([
      { text: "Le petit pri", match: true },
      { text: "nce", match: false },
    ]);
    expect(marked("Le petit prince", "prince")).toEqual(["prince"]);
    expect(marked("Bilbo le Hobbit", "hob")).toEqual(["Hob"]);
  });

  it("ignores the accents and the case, both ways", () => {
    expect(marked("La Chute d’Hypérion", "hyperion")).toEqual(["Hypérion"]);
    expect(marked("Les Fourmis", "LES FOURM")).toEqual(["Les Fourm"]);
    expect(marked("Ecoute la ville tomber", "écoute")).toEqual(["Ecoute"]);
    // A title whose accent is a character of its own keeps it inside the mark.
    const nfd = "Hypérion".normalize("NFD");
    expect(marked(nfd, "hyperion")).toEqual([nfd]);
  });

  it("only starts a mark at the beginning of a word", () => {
    // « pri » is in « imprimé » too — marking it there would look like a bug.
    expect(marked("Un livre imprimé", "pri")).toEqual([]);
    expect(marked("Le prince imprimé", "pri")).toEqual(["pri"]);
    // A hyphen or an apostrophe opens a word.
    expect(marked("Jean-Christophe", "chris")).toEqual(["Chris"]);
    expect(marked("L’Étranger", "etran")).toEqual(["Étran"]);
  });

  it("marks every word typed, wherever it sits", () => {
    expect(marked("Le prince et le pauvre", "le")).toEqual(["Le", "le"]);
    expect(marked("Germinal, roman de Zola", "zola germinal")).toEqual(["Germinal", "Zola"]);
  });

  it("gives the title back untouched when there is nothing to mark", () => {
    expect(highlightParts("Les Furtifs", "")).toEqual([{ text: "Les Furtifs", match: false }]);
    expect(highlightParts("Les Furtifs", "   ")).toEqual([{ text: "Les Furtifs", match: false }]);
    expect(highlightParts("Les Furtifs", "damasio")).toEqual([{ text: "Les Furtifs", match: false }]);
    expect(highlightParts("", "furtifs")).toEqual([]);
  });

  it("never loses a character, whatever is typed", () => {
    const title = "Harry Potter à l’école des sorciers";
    for (const q of ["", "harry", "harry potter", "ecole", "à l'ecole", "sorc", "harry sorciers", "zzz"]) {
      expect(whole(title, q), q).toBe(title);
    }
    // An emoji is one character, not two halves of one.
    expect(whole("Le 🐉 dragon", "dragon")).toBe("Le 🐉 dragon");
    expect(marked("Le 🐉 dragon", "dragon")).toEqual(["dragon"]);
  });
});
