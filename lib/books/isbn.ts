/**
 * ISBN — reading the number printed on the back of the book one holds.
 *
 * Pure: `detectIsbn` says whether what is being typed *is* an ISBN and hands
 * back its bare digits; the search route then asks OpenLibrary for that exact
 * edition instead of running a title search. No I/O here.
 */

/**
 * The « ISBN », « ISBN-13 : », « ISBN13: » a reader copies along with the
 * number. Dropped before anything else — it is a label, not part of the code.
 */
const LABEL = /^isbn(?:[\s_-]*1[03])?\s*:?\s*/i;

/**
 * What separates the groups of an ISBN: the hyphen in all its printed shapes
 * (hyphen-minus, then the U+2010…U+2015 dashes), every space `\s` knows —
 * insécable and fine included — and the dot some catalogues use.
 */
const SEPARATORS = /[\s.‐-―-]/g;

/** ISBN-10: nine digits and a check character, which may be an X (ten). */
const SHAPE_10 = /^[0-9]{9}[0-9X]$/;

/**
 * ISBN-13: the thirteen digits of the bookland EAN. The 978/979 head is
 * required — without it any thirteen-digit number with a valid EAN key (a
 * barcode, a reference) would be mistaken for a book.
 */
const SHAPE_13 = /^97[89][0-9]{10}$/;

/** ISBN-10 key: Σ (10 − i) × value ≡ 0 [11], the X standing for ten. */
function isValid10(isbn: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = isbn[i];
    sum += (10 - i) * (c === "X" ? 10 : c.charCodeAt(0) - 48);
  }
  return sum % 11 === 0;
}

/** ISBN-13 key: Σ digit × (1, 3, 1, 3…) ≡ 0 [10]. */
function isValid13(isbn: string): boolean {
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += (isbn.charCodeAt(i) - 48) * (i % 2 === 0 ? 1 : 3);
  return sum % 10 === 0;
}

/**
 * The ISBN read in what was typed — bare, uppercase, hyphens and spaces gone —
 * or null when it is not one.
 *
 * Both lengths are accepted and given back as they were typed: OpenLibrary
 * looks up either. The check digit is verified, so « 9782070612758 » is an
 * ISBN, a thirteen-digit typo is not, and a title stays a title.
 */
export function detectIsbn(input: string): string | null {
  const bare = input.trim().replace(LABEL, "").replace(SEPARATORS, "").toUpperCase();
  if (SHAPE_10.test(bare) && isValid10(bare)) return bare;
  if (SHAPE_13.test(bare) && isValid13(bare)) return bare;
  return null;
}
