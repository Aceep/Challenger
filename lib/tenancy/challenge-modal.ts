/**
 * The form behind `/challenger creer`: a Discord modal that asks everything an
 * edition needs — name, start date, length and teams — so the whole challenge is
 * born from one command, without a detour through the site.
 *
 * Pure module, no I/O: the wire payload and the parsing of what comes back live
 * here, unit-tested, and the route only decides what to answer. Discord's own
 * limits (5 inputs, 45-character labels, 100-character placeholders) are
 * enforced by `modalPayload`; the game limits are enforced here.
 */
import { fr } from "@/lib/discord/cards";
import { TEXT_STYLE, type TextInput } from "@/lib/discord/components";
import { DEFAULT_WEEKS, defaultDatesFor, guildChallengeName } from "@/lib/tenancy/new-challenge";

/** `custom_id` of the modal — the route recognises the submission by it. */
export const CHALLENGE_MODAL_ID = "challenger:modal";

export const CHALLENGE_MODAL_TITLE = "Créer le défi de ce serveur";

/** `custom_id` of each input, i.e. the keys `modalValues` gives back. */
export const CHALLENGE_FIELD = { name: "nom", start: "debut", weeks: "semaines", teams: "equipes" } as const;

/** A challenge lasts at least a week, and at most a year. */
export const WEEKS_MIN = 1;
export const WEEKS_MAX = 52;

/**
 * Two teams at least — a challenge is a race — and twelve at most: the bootstrap
 * pays about 350 ms per Discord mutation, and twelve teams already take some
 * twenty-five seconds, close to what a deferred interaction can hold.
 */
export const TEAMS_MIN = 2;
export const TEAMS_MAX = 12;

/** Same limit as `teamSchema` on the site, so a name typed here is always saveable. */
const TEAM_NAME_MAX = 60;

/** Discord refuses a challenge name over 100 characters; so does `challengeFields`. */
const NAME_MAX = 100;

const DAY_MS = 86_400_000;

/**
 * Colours handed out to the teams that did not choose one. Mid-tone hues, all
 * legible as a Discord role name on the light **and** the dark theme — a pastel
 * disappears on white, a dark one on the dark grey.
 */
export const TEAM_PALETTE = [
  "#d97706", // ambre
  "#2563eb", // bleu
  "#16a34a", // vert
  "#db2777", // rose
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#b45309", // cuivre
  "#dc2626", // rouge
] as const;

// ---------------------------------------------------------------------------
// The payload Discord opens
// ---------------------------------------------------------------------------

/** `JJ/MM/AAAA` of a UTC date — the format the modal asks for and reads back. */
export function formatFrDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/**
 * The four inputs, pre-filled with what a sane edition looks like: the server's
 * name, the next Monday, eight weeks. Only the teams are left blank — they are
 * the one thing nobody can guess.
 */
export function challengeModalInputs({ guildName, now = new Date() }: { guildName?: string | null; now?: Date }): TextInput[] {
  const { startAt } = defaultDatesFor(now);
  // `fr()` over the visible copy, like everywhere else: Discord shows labels and
  // placeholders exactly as typed, narrow spaces included.
  return typographied([
    {
      customId: CHALLENGE_FIELD.name,
      label: "Nom du défi",
      style: TEXT_STYLE.SHORT,
      required: true,
      maxLength: NAME_MAX,
      placeholder: "Le défi de l’hiver",
      value: guildChallengeName(guildName),
    },
    {
      customId: CHALLENGE_FIELD.start,
      label: "Date de début (JJ/MM/AAAA)",
      style: TEXT_STYLE.SHORT,
      required: true,
      minLength: 8,
      maxLength: 10,
      placeholder: "05/01/2026",
      value: formatFrDate(startAt),
    },
    {
      customId: CHALLENGE_FIELD.weeks,
      label: "Durée, en semaines",
      style: TEXT_STYLE.SHORT,
      required: true,
      maxLength: 2,
      placeholder: "8",
      value: String(DEFAULT_WEEKS),
    },
    {
      customId: CHALLENGE_FIELD.teams,
      label: "Équipes, une par ligne",
      style: TEXT_STYLE.PARAGRAPH,
      required: true,
      maxLength: 1000,
      placeholder: "Une équipe par ligne, couleur facultative : Les Renards, #d97706",
    },
  ]);
}

const typographied = (inputs: TextInput[]): TextInput[] =>
  inputs.map((i) => ({ ...i, label: fr(i.label), placeholder: i.placeholder === undefined ? undefined : fr(i.placeholder) }));

// ---------------------------------------------------------------------------
// What comes back
// ---------------------------------------------------------------------------

export type ChallengeModalTeam = { name: string; color: string };

export type ChallengeModalData = {
  name: string;
  startAt: Date;
  endAt: Date;
  teams: ChallengeModalTeam[];
};

/** A refusal carries the sentence the player reads, already typographied. */
export type ParsedModal<T> = { ok: true; data: T } | { ok: false; error: string };

const fail = (message: string): { ok: false; error: string } => ({ ok: false, error: fr(message) });

/**
 * `JJ/MM/AAAA` → UTC midnight, like `defaultDatesFor`, so the two creation paths
 * store the same kind of instant. `J/M/AAAA` is accepted (people type 5/1/2026),
 * an impossible day is not: 31/02/2026 round-trips to 03/03 and is refused.
 */
export function parseFrDate(raw: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  const valid = d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
  return valid ? d : null;
}

/** « Les Hérissons » and « les herissons » are the same team: Discord reuses a role by name. */
const fold = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * The teams paragraph, one per line, `Nom` or `Nom, #rrggbb`. Blank lines are
 * ignored (a trailing newline is the rule, not the exception), the colours left
 * out are drawn from `TEAM_PALETTE` in order, and two teams that would end up
 * with the same Discord role are refused rather than silently merged.
 */
export function parseTeamLines(raw: string): ParsedModal<ChallengeModalTeam[]> {
  const teams: ChallengeModalTeam[] = [];
  const seen = new Set<string>();

  for (const line of (raw ?? "").split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;

    const m = /^(.*?)\s*,\s*#?([0-9a-fA-F]{6})$/.exec(text);
    const name = (m ? m[1] : text).trim();
    const color = m ? `#${m[2].toLowerCase()}` : null;

    if (!name) return fail(`« ${text} » n’a pas de nom d’équipe avant sa couleur.`);
    if (name.length > TEAM_NAME_MAX) return fail(`Le nom « ${name.slice(0, 30)}… » dépasse ${TEAM_NAME_MAX} caractères.`);
    if (seen.has(fold(name))) return fail(`L’équipe « ${name} » est écrite deux fois.`);
    seen.add(fold(name));

    teams.push({ name, color: color ?? TEAM_PALETTE[teams.length % TEAM_PALETTE.length] });
    if (teams.length > TEAMS_MAX) return fail(`${TEAMS_MAX} équipes au maximum, une par ligne.`);
  }

  if (teams.length < TEAMS_MIN) return fail(`Il faut au moins ${TEAMS_MIN} équipes, une par ligne.`);
  return { ok: true, data: teams };
}

/**
 * The whole submission. Everything is checked before a single row is written:
 * the modal closes on send, so a refusal costs the person a retype of the
 * command — it must say precisely what to fix.
 */
export function parseChallengeModal(values: Record<string, string>, now: Date = new Date()): ParsedModal<ChallengeModalData> {
  const name = (values[CHALLENGE_FIELD.name] ?? "").trim().slice(0, NAME_MAX);
  if (!name) return fail("Le défi a besoin d’un nom.");

  const startAt = parseFrDate(values[CHALLENGE_FIELD.start] ?? "");
  if (!startAt) return fail("La date de début s’écrit JJ/MM/AAAA, par exemple 05/01/2026.");
  // A year typed one digit off (2025 for 2026) would open a challenge nobody can
  // play: the window bounds the ledger. Anything a season away is still allowed.
  const months = (startAt.getTime() - now.getTime()) / (30 * DAY_MS);
  if (months < -12 || months > 24) return fail("Vérifie l’année de la date de début : elle est très loin d’aujourd’hui.");

  const weeksRaw = (values[CHALLENGE_FIELD.weeks] ?? "").trim();
  const weeks = /^\d{1,2}$/.test(weeksRaw) ? Number(weeksRaw) : Number.NaN;
  if (!Number.isInteger(weeks) || weeks < WEEKS_MIN || weeks > WEEKS_MAX) {
    return fail(`La durée s’écrit en semaines, entre ${WEEKS_MIN} et ${WEEKS_MAX}.`);
  }

  const teams = parseTeamLines(values[CHALLENGE_FIELD.teams] ?? "");
  if (!teams.ok) return teams;

  return { ok: true, data: { name, startAt, endAt: new Date(startAt.getTime() + weeks * 7 * DAY_MS), teams: teams.data } };
}
