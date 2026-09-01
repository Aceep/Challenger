import { describe, expect, it } from "vitest";
import { detectIsbn } from "./isbn";

describe("detectIsbn", () => {
  it("reads the number printed on the back of the book, hyphens and all", () => {
    // « Le petit prince », Folio — the same book in its four printed shapes.
    expect(detectIsbn("9782070612758")).toBe("9782070612758");
    expect(detectIsbn("978-2-07-061275-8")).toBe("9782070612758");
    expect(detectIsbn("978 2 07 061275 8")).toBe("9782070612758");
    expect(detectIsbn("  978-2-07-061275-8  ")).toBe("9782070612758");
  });

  it("reads an ISBN-10 as well, its X included", () => {
    expect(detectIsbn("2070612759")).toBe("2070612759");
    expect(detectIsbn("2-07-061275-9")).toBe("2070612759");
    expect(detectIsbn("2266111566")).toBe("2266111566");
    expect(detectIsbn("155404295X")).toBe("155404295X");
    expect(detectIsbn("1-55404-295-x")).toBe("155404295X");
  });

  it("drops the label copied along with the number", () => {
    expect(detectIsbn("ISBN 978-2-07-061275-8")).toBe("9782070612758");
    expect(detectIsbn("isbn: 9782070612758")).toBe("9782070612758");
    expect(detectIsbn("ISBN-13 : 978-2-07-061275-8")).toBe("9782070612758");
    expect(detectIsbn("ISBN-10 2070612759")).toBe("2070612759");
  });

  it("copes with the separators a catalogue or a phone keyboard produces", () => {
    // Insécable, fine insécable, tiret demi-cadratin, point.
    expect(detectIsbn("978 2 07 061275 8")).toBe("9782070612758");
    expect(detectIsbn("978 2 07 061275 8")).toBe("9782070612758");
    expect(detectIsbn("978–2–07–061275–8")).toBe("9782070612758");
    expect(detectIsbn("978.2.07.061275.8")).toBe("9782070612758");
  });

  it("accepts the 979 range, which French publishers now use", () => {
    expect(detectIsbn("979-10-90636-07-1")).toBe("9791090636071");
  });

  it("refuses a wrong check digit — a typo is not a book", () => {
    expect(detectIsbn("9782070612759")).toBeNull();
    expect(detectIsbn("2070612758")).toBeNull();
    expect(detectIsbn("155404295Y")).toBeNull();
  });

  it("refuses what is merely thirteen digits: only 978 and 979 are books", () => {
    // A valid EAN-13 all the same — a barcode read off a cereal box.
    expect(detectIsbn("4006381333931")).toBeNull();
    expect(detectIsbn("1234567890128")).toBeNull();
  });

  it("leaves a title alone, however numeric", () => {
    expect(detectIsbn("Le petit prince")).toBeNull();
    expect(detectIsbn("1984")).toBeNull();
    expect(detectIsbn("2001 : l’odyssée de l’espace")).toBeNull();
    expect(detectIsbn("")).toBeNull();
    expect(detectIsbn("isbn")).toBeNull();
    // Neither ten nor thirteen digits long.
    expect(detectIsbn("978207061275")).toBeNull();
    expect(detectIsbn("97820706127588")).toBeNull();
  });
});
