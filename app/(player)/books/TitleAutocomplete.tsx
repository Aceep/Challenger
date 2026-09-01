"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Pill } from "@/components/ui";
import { BookCover } from "@/components/ui/BookCover";
import { PencilIcon } from "@/components/ui/icons";
import { highlightParts } from "@/lib/books/highlight";
import type { BookSuggestion } from "@/lib/books/openlibrary";
import { fmtPoints } from "@/lib/format";
import { readingPoints } from "@/lib/scoring/reading";

/** Long enough for a two-word title to settle, short enough to feel instant. */
const DEBOUNCE_MS = 300;
/** Same floor as the route: below two characters everything matches. */
const MIN_QUERY = 2;

/**
 * Where the search stands. `searching` opens on the keystroke, debounce included,
 * so the spinner lights up at once rather than 300 ms later; `done` means the last
 * search came back, and `items` is its answer — empty answer included.
 */
type Phase = "idle" | "searching" | "done";

type Props = {
  value: string;
  onChange: (title: string) => void;
  /** A line was picked: prefill the author, the pages and the cover. */
  onPick: (suggestion: BookSuggestion) => void;
  /**
   * Rate of the current challenge: what the « 96 p. ≈ 9,6 pts » badge counts
   * with. Left out, `readingPoints` falls back on the standard 0,1 pt per page.
   */
  pointsPerPage?: number;
  /** « Je ne trouve pas mon livre » — the form takes the relay and focuses the author. */
  onManualEntry: () => void;
  autoFocus?: boolean;
  /** Off on /demo, where the search route (signed-in only) would bounce to the login. */
  disabled?: boolean;
};

/** What the live region says — a screen reader hears the count, the eye reads the list. */
function announce(phase: Phase, items: BookSuggestion[]) {
  if (phase === "searching") return "Recherche en cours…";
  if (phase !== "done") return "";
  if (items.length === 0) return "Aucun livre trouvé.";
  if (items[0].isbn) return "ISBN reconnu : 1 livre proposé.";
  return items.length === 1 ? "1 livre proposé." : `${items.length} livres proposés.`;
}

/** « Antoine de Saint-Exupéry · 1943 », and what is missing said plainly. */
function metaOf(s: BookSuggestion): string {
  const parts = [s.author, s.year ? String(s.year) : null, s.pages ? null : "pages à compléter"].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "à compléter à la main";
}

/** One line of the list: the cover, the title with what was typed lit up, the points it is worth. */
function Suggestion({ suggestion, query, pointsPerPage }: { suggestion: BookSuggestion; query: string; pointsPerPage?: number }) {
  const points = suggestion.pages ? readingPoints(suggestion.pages, pointsPerPage) : 0;
  return (
    <>
      <BookCover src={suggestion.coverUrl} title={suggestion.title} width={30} />
      <span className="combo-text">
        <span className="combo-title">
          {highlightParts(suggestion.title, query).map((part, i) => (part.match ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}
        </span>
        <span className="combo-meta">
          {suggestion.isbn && <span className="combo-flag">ISBN reconnu</span>}
          <span className="combo-meta-text">{metaOf(suggestion)}</span>
        </span>
      </span>
      {suggestion.pages ? (
        <Pill stamp xs tone="ok" className="combo-points">
          {suggestion.pages} p. ≈ {fmtPoints(points)} pt{points >= 2 ? "s" : ""}
        </Pill>
      ) : null}
    </>
  );
}

/**
 * Titre — a search bar on OpenLibrary. Typing searches by title, and an ISBN
 * typed or copied off the back cover fetches that exact edition; ↑ ↓ walk the
 * list, Entrée picks, Échap closes. The last line is always « Je ne trouve pas
 * mon livre », so a book nobody indexed is one keystroke from being typed by
 * hand — and everything stays a plain text input all the same. A failing search
 * is silent on purpose.
 */
export function TitleAutocomplete({ value, onChange, onPick, pointsPerPage, onManualEntry, autoFocus, disabled }: Props) {
  const [items, setItems] = useState<BookSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [phase, setPhase] = useState<Phase>("idle");
  // The value we have just written ourselves (mount, or a pick) must not re-search.
  const quiet = useRef(true);
  // Only the latest run may end the wait: an aborted one must not stop the spinner.
  const run = useRef(0);
  const listId = useId();
  // The list is the suggestions plus the way out, which is an option like any other.
  const manualIndex = items.length;
  const optionId = (i: number) => `${listId}-${i}`;

  useEffect(() => {
    if (disabled) return;
    if (quiet.current) {
      quiet.current = false;
      return;
    }
    // Too short is handled by `type()`, which empties the list as it is typed.
    const q = value.trim();
    if (q.length < MIN_QUERY) return;
    const runId = ++run.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const found: BookSuggestion[] = res.ok ? await res.json() : [];
        setItems(found);
        setActive(-1);
        setOpen(true);
      } catch {
        // Aborted, offline, or an answer we cannot read: the three fields are typed by hand.
      } finally {
        if (run.current === runId) setPhase("done");
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, disabled]);

  // Walking the list with the keyboard must bring the line into sight.
  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
    // `optionId` is `listId` and the index — no need to re-run when the closure changes.
  }, [open, active, listId]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const type = (next: string) => {
    onChange(next);
    // On the demo the route would bounce to the login: the field stays a plain input.
    if (disabled) return;
    // Nothing left to match: drop the list right away rather than after the debounce.
    if (next.trim().length < MIN_QUERY) {
      setItems([]);
      setPhase("idle");
      close();
      return;
    }
    // The wait starts on the keystroke, debounce included — that is what the spinner shows.
    setPhase("searching");
    setOpen(true);
  };

  const pick = (suggestion: BookSuggestion) => {
    quiet.current = true;
    onPick(suggestion);
    setItems([]);
    setPhase("idle");
    close();
  };

  /** « Je ne trouve pas mon livre » — the list steps aside and the author field takes over. */
  const manual = () => {
    setItems([]);
    setPhase("idle");
    close();
    onManualEntry();
  };

  const choose = (i: number) => (i === manualIndex ? manual() : pick(items[i]));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    const count = manualIndex + 1;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % count : i <= 0 ? count - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      // Prevents the surrounding <dialog> from taking the Échap for itself.
      e.preventDefault();
      close();
    }
  };

  const searching = phase === "searching" && !disabled;
  // A new search over an answered one: the old lines stay readable, dimmed and topped by the bar.
  const stale = searching && items.length > 0;
  const query = value.trim();

  return (
    <div className="combo">
      <div className="combo-input">
        <input
          name="title"
          required
          maxLength={200}
          value={value}
          onChange={(e) => type(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => !disabled && items.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(close, 120)}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          aria-describedby={`${listId}-hint`}
        />
        {searching && (
          <span className="combo-spin" aria-hidden="true">
            <span className="spinner" />
          </span>
        )}
      </div>
      <span id={`${listId}-hint`} className="hint">
        {disabled
          ? "Sur la démo, la recherche est désactivée."
          : "Tape le titre — ou l’ISBN du livre que tu as en main : Kyle remplit l’auteur·ice, les pages et la couverture."}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {disabled ? "" : announce(phase, items)}
      </span>
      {open && (
        <div className="combo-pop">
          {stale && <span className="combo-bar" aria-hidden="true" />}
          <ul
            className={stale ? "combo-list is-stale" : "combo-list"}
            id={listId}
            role="listbox"
            aria-label="Suggestions de livres"
            aria-busy={searching}
          >
            {items.map((s, i) => (
              <li
                key={`${s.title}-${s.author ?? ""}-${i}`}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={i === active ? "is-active" : undefined}
                // mousedown, not click: the blur must not close the list before the pick.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <Suggestion suggestion={s} query={query} pointsPerPage={pointsPerPage} />
              </li>
            ))}
            {items.length === 0 && (
              <li className="combo-status" role="presentation">
                {searching ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Recherche en cours…
                  </>
                ) : (
                  "Aucun livre trouvé."
                )}
              </li>
            )}
            {/* Always the last line, answer or no answer: nobody is ever stuck in the list. */}
            <li
              id={optionId(manualIndex)}
              role="option"
              aria-selected={active === manualIndex}
              className={active === manualIndex ? "combo-manual is-active" : "combo-manual"}
              onMouseDown={(e) => {
                e.preventDefault();
                manual();
              }}
              onMouseEnter={() => setActive(manualIndex)}
            >
              <PencilIcon />
              <span className="combo-text">
                <span className="combo-title">Je ne trouve pas mon livre</span>
                <span className="combo-meta">
                  <span className="combo-meta-text">Remplir la fiche à la main</span>
                </span>
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
