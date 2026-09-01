/**
 * Highlighting — showing, inside a suggested title, the part that was typed.
 *
 * Pure and accent-blind: « hyperion » lights up « Hypérion », « LE PETIT »
 * lights up « Le petit ». No I/O, no JSX — the component only wraps the parts
 * marked `true` in a `<mark>`.
 */

/** A slice of the title: `match` says whether it answers what was typed. */
export type TitlePart = { text: string; match: boolean };

/** Letters and digits — what makes a word, so a match may only start on one. */
const WORD = /[\p{L}\p{N}]/u;

/** Lowercase and accent-free, so « Hypérion » and « hyperion » are one word. */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

/**
 * The title folded, plus, for each folded character, the index of the character
 * it came from. Accents vanish (« é » → « e ») and the index still points at
 * the original letter, so the slices given back are the title's own text.
 */
function foldWithMap(chars: readonly string[]): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  chars.forEach((char, i) => {
    const f = fold(char);
    folded += f;
    // One entry per UTF-16 unit, so `folded.indexOf` and `map` agree even on an
    // emoji, which is one character but two units.
    for (let k = 0; k < f.length; k++) map.push(i);
  });
  return { folded, map };
}

/** Every place `word` starts a word of `folded`. */
function starts(folded: string, word: string): [number, number][] {
  const out: [number, number][] = [];
  for (let i = folded.indexOf(word); i !== -1; i = folded.indexOf(word, i + 1)) {
    if (i === 0 || !WORD.test(folded[i - 1])) out.push([i, i + word.length]);
  }
  return out;
}

/**
 * Ranges sorted and welded: two of them touch, overlap, or are parted by spaces
 * only — « Petit » and « Prince » of « le petit prin » — and become one, so the
 * highlight runs across the words instead of blinking between them.
 */
function weld(ranges: [number, number][], folded: string): [number, number][] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: [number, number][] = [];
  for (const [from, to] of sorted) {
    const last = out[out.length - 1];
    if (last && folded.slice(last[1], from).trim() === "") last[1] = Math.max(last[1], to);
    else out.push([from, to]);
  }
  return out;
}

/**
 * The title cut into parts, the ones answering `query` marked.
 *
 * Each word typed is looked for at the beginning of a word of the title —
 * « pri » lights up « **pri**nce », never the « pri » of « imprimé » — and
 * neighbouring hits are welded, so « le petit pri » underlines « **Le petit
 * pri**nce » in one stroke.
 *
 * Whatever cannot be matched (an empty query, a title with none of the words)
 * comes back as one unmarked part: the caller renders the parts, always.
 */
export function highlightParts(text: string, query: string): TitlePart[] {
  const chars = Array.from(text);
  if (chars.length === 0) return [];
  const words = [...new Set(fold(query).split(/\s+/).filter(Boolean))];
  if (words.length === 0) return [{ text, match: false }];

  const { folded, map } = foldWithMap(chars);
  const hits = weld(
    words.flatMap((w) => starts(folded, w)),
    folded,
  );
  if (hits.length === 0) return [{ text, match: false }];

  // The characters that folded to nothing — a lone combining accent — belong to
  // the letter before them, or the highlight would cut « é » in two.
  const kept = new Set(map);
  const parts: TitlePart[] = [];
  const push = (from: number, to: number, match: boolean) => {
    if (to > from) parts.push({ text: chars.slice(from, to).join(""), match });
  };
  let cursor = 0;
  for (const [from, to] of hits) {
    // A folded index points at the character it came from; the end is the one after.
    const start = map[from];
    let end = map[to - 1] + 1;
    while (end < chars.length && !kept.has(end)) end++;
    push(cursor, start, false);
    push(start, end, true);
    cursor = end;
  }
  push(cursor, chars.length, false);
  return parts;
}
