"use client";

import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/ui";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";

/**
 * « Inviter » without an 18-digit identifier.
 *
 * One types the first letters of a pseudonym, Kyle searches the members of the
 * server (`GET /guilds/{id}/members/search`, which needs no privileged intent)
 * and the choice fills the hidden `discordId` field. The old numeric entry
 * stays, folded into a `<details>`: it is the only way in for someone who is
 * not on the server yet.
 */

export type MemberHit = { id: string; label: string; sub?: string };

/** Shortened identifier, as the players table shows them. */
const shortId = (id: string) => (id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id);

/**
 * The historical field: a Discord id typed (or pasted) by hand — the only way
 * in for someone who is not on the server yet.
 *
 * `required` is dropped inside the picker: a required control hidden in a
 * closed `<details>` blocks the submission without ever saying why. The server
 * (zod, `inviteSchema`) has the last word anyway.
 */
export function ManualIdField({ required = true }: { required?: boolean }) {
  return (
    <label className="field">
      Identifiant Discord
      <input name="discordId" required={required} inputMode="numeric" placeholder="ex. 402911870034211187" />
      <span className="hint">
        Discord → Paramètres → Avancés → Mode développeur, puis clic droit sur la personne → «&nbsp;Copier l&apos;identifiant&nbsp;».
      </span>
    </label>
  );
}

export function MemberPicker({ search }: { search: (query: string) => Promise<MemberHit[]> }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MemberHit | null>(null);
  /** The last answer, with the query it answers: anything else is stale. */
  const [answer, setAnswer] = useState<{ query: string; hits: MemberHit[] } | null>(null);
  const [pending, startTransition] = useTransition();

  const q = query.trim();
  const searchable = !selected && q.length >= 2;

  // 300 ms after the last keystroke: one request per pause, not per letter.
  // Nothing is written outside the timer — the displayed list is derived below,
  // so a cleared field shows nothing without a render of its own.
  useEffect(() => {
    if (!searchable) return;
    const timer = setTimeout(() => {
      startTransition(async () => setAnswer({ query: q, hits: await search(q) }));
    }, 300);
    return () => clearTimeout(timer);
  }, [q, searchable, search]);

  const fresh = searchable && answer?.query === q;
  const hits = fresh ? answer.hits : [];

  if (selected) {
    return (
      <div className="field">
        <span>Personne invitée</span>
        <span className="flex items-center gap-2 rounded-[var(--r-pill)] border border-[color:var(--line)] bg-[color:var(--surface-2)] px-2 py-1 text-sm">
          <Avatar name={selected.label} color="var(--olive)" size={22} />
          <span className="min-w-0 truncate">
            {selected.label}
            <span className="text-[color:var(--muted)]"> · identifiant {shortId(selected.id)}</span>
          </span>
          <button type="button" onClick={() => setSelected(null)} aria-label="Choisir quelqu’un d’autre" className="ml-auto flex items-center">
            <CloseIcon className="ico" />
          </button>
        </span>
        <input type="hidden" name="discordId" value={selected.id} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="field">
        Membre du serveur
        <span className="flex items-center gap-2">
          <SearchIcon className="ico shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tape un pseudo, ex. nou"
            aria-label="Chercher un membre du serveur Discord"
            className="min-w-0 flex-1"
          />
        </span>
        <span className="hint">Deux lettres suffisent. Les bots ne sont pas proposés.</span>
      </label>

      {pending && <p className="text-xs text-[color:var(--muted)]">Recherche…</p>}
      {!pending && fresh && hits.length === 0 && (
        <p className="text-xs text-[color:var(--muted)]">Personne de ce nom sur le serveur — la personne n’y est peut-être pas encore : son identifiant suffit.</p>
      )}
      {hits.length > 0 && (
        <ul className="flex list-none flex-col gap-1 p-0">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => setSelected(hit)}
                className="flex w-full items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--line)] bg-[color:var(--surface)] px-2 py-1 text-left text-sm"
              >
                <Avatar name={hit.label} color="var(--olive)" size={22} />
                <span className="min-w-0 truncate">
                  {hit.label}
                  {hit.sub && <span className="text-[color:var(--muted)]"> · {hit.sub}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <details>
        <summary className="cursor-pointer text-[13px] text-[color:var(--muted)]">Saisir un identifiant à la main</summary>
        <div className="pt-2">
          <ManualIdField required={false} />
        </div>
      </details>
    </div>
  );
}
