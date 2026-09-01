"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BookCover } from "@/components/ui/BookCover";
import type { BookSuggestion } from "@/lib/books/openlibrary";

/** Long enough for a two-word title to settle, short enough to feel instant. */
const DEBOUNCE_MS = 300;
/** Same floor as the route: below two characters everything matches. */
const MIN_QUERY = 2;

type Props = {
  value: string;
  onChange: (title: string) => void;
  /** A line was picked: prefill the author, the pages and the cover. */
  onPick: (suggestion: BookSuggestion) => void;
  autoFocus?: boolean;
  /** Off on /demo, where the search route (signed-in only) would bounce to the login. */
  disabled?: boolean;
};

/**
 * Titre — a combobox on OpenLibrary. Typing searches, ↑ ↓ walk the list, Entrée
 * picks, Échap closes; everything stays a plain text input, so a book nobody
 * indexed is still typed by hand. A failing search is silent on purpose.
 */
export function TitleAutocomplete({ value, onChange, onPick, autoFocus, disabled }: Props) {
  const [items, setItems] = useState<BookSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  // The value we have just written ourselves (mount, or a pick) must not re-search.
  const quiet = useRef(true);
  const listId = useId();

  useEffect(() => {
    if (disabled) return;
    if (quiet.current) {
      quiet.current = false;
      return;
    }
    // Too short is handled by `type()`, which empties the list as it is typed.
    const q = value.trim();
    if (q.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const found: BookSuggestion[] = res.ok ? await res.json() : [];
        setItems(found);
        setActive(-1);
        setOpen(found.length > 0);
      } catch {
        // Aborted, offline, or an answer we cannot read: the three fields are typed by hand.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, disabled]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const type = (next: string) => {
    onChange(next);
    // Nothing left to match: drop the list right away rather than after the debounce.
    if (next.trim().length < MIN_QUERY) {
      setItems([]);
      close();
    }
  };

  const pick = (suggestion: BookSuggestion) => {
    quiet.current = true;
    onPick(suggestion);
    setItems([]);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % items.length : i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape") {
      // Prevents the surrounding <dialog> from taking the Échap for itself.
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="combo">
      <input
        name="title"
        required
        maxLength={200}
        value={value}
        onChange={(e) => type(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => items.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(close, 120)}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby={`${listId}-hint`}
      />
      <span id={`${listId}-hint`} className="hint">
        {disabled ? "Sur la démo, la recherche est désactivée." : "Tape trois lettres : Kyle cherche le livre et remplit l’auteur·ice, les pages et la couverture."}
        {loading && !disabled ? " Recherche…" : ""}
      </span>
      {open && (
        <ul className="combo-list" id={listId} role="listbox" aria-label="Suggestions de livres">
          {items.map((s, i) => (
            <li
              key={`${s.title}-${s.author ?? ""}-${i}`}
              id={`${listId}-${i}`}
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
              <BookCover src={s.coverUrl} title={s.title} width={30} />
              <span className="combo-text">
                <span className="combo-title">{s.title}</span>
                <span className="combo-meta">
                  {[s.author, s.pages ? `${s.pages} p.` : null].filter(Boolean).join(" · ") || "auteur·ice et pages à compléter"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
