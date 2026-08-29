/**
 * Discord message components (v1 action rows): pure builders for buttons,
 * string selects and modals, plus the `book:*` custom-id namespace used by the
 * « J'ai fini un livre » flow.
 *
 * No `server-only`, no I/O: everything here is data, so it is unit-tested and
 * safe to import from anywhere.
 */

/** Discord component/interaction wire constants. */
export const COMPONENT = { ACTION_ROW: 1, BUTTON: 2, STRING_SELECT: 3, TEXT_INPUT: 4 } as const;
export const TEXT_STYLE = { SHORT: 1, PARAGRAPH: 2 } as const;

/** Discord hard limits we clamp to, so a payload is never rejected. */
export const LIMIT = {
  customId: 100,
  label: 80,
  selectLabel: 100,
  selectValue: 100,
  description: 100,
  options: 25,
  placeholder: 100,
  modalTitle: 45,
  inputLabel: 45,
  rows: 5,
  buttonsPerRow: 5,
} as const;

/** Sentinel value of the « — aucune — » option (an empty select value is illegal). */
export const NONE = "-";

// ---------------------------------------------------------------------------
// custom ids
// ---------------------------------------------------------------------------

export type BookAction = "new" | "type" | "quest" | "cell" | "save" | "cancel";

const BOOK_ACTIONS: readonly BookAction[] = ["new", "type", "quest", "cell", "save", "cancel"];
const BOOK_PREFIX = "book";

/** `book:save:<pendingId>` — always ≤ 100 chars (10 + a 25-char cuid). */
export function bookId(action: BookAction, pendingId?: string): string {
  return pendingId ? `${BOOK_PREFIX}:${action}:${pendingId}` : `${BOOK_PREFIX}:${action}`;
}

/** null when the id is not ours or is malformed. */
export function parseBookId(customId: string): { action: BookAction; pendingId: string | null } | null {
  const parts = customId.split(":");
  if (parts.length < 2 || parts.length > 3 || parts[0] !== BOOK_PREFIX) return null;
  const action = parts[1] as BookAction;
  if (!BOOK_ACTIONS.includes(action)) return null;
  return { action, pendingId: parts[2] || null };
}

export const BOOK_MODAL_ID = "book:modal";
export const MODAL_FIELD = { title: "titre", author: "auteur", pages: "pages" } as const;

// ---------------------------------------------------------------------------
// builders
// ---------------------------------------------------------------------------

export type SelectOption = { label: string; value: string; description?: string; default?: boolean };
export type MessageSelect = {
  customId: string;
  placeholder?: string;
  options: SelectOption[];
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
};
export type MessageButton = { customId: string; label: string; style?: 1 | 2 | 3 | 4; disabled?: boolean };
export type ComponentRow = { buttons: MessageButton[] } | { select: MessageSelect };

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

function buttonComponent(b: MessageButton) {
  return {
    type: COMPONENT.BUTTON,
    style: b.style ?? 2,
    label: cut(b.label, LIMIT.label),
    custom_id: cut(b.customId, LIMIT.customId),
    disabled: b.disabled ?? false,
  };
}

function selectComponent(s: MessageSelect) {
  return {
    type: COMPONENT.STRING_SELECT,
    custom_id: cut(s.customId, LIMIT.customId),
    placeholder: s.placeholder === undefined ? undefined : cut(s.placeholder, LIMIT.placeholder),
    options: s.options.slice(0, LIMIT.options).map((o) => ({
      label: cut(o.label, LIMIT.selectLabel),
      value: cut(o.value, LIMIT.selectValue),
      description: o.description === undefined ? undefined : cut(o.description, LIMIT.description),
      default: o.default ?? false,
    })),
    min_values: s.minValues ?? 1,
    max_values: s.maxValues ?? 1,
    disabled: s.disabled ?? false,
  };
}

/** Action rows, clamped: ≤ 5 rows, ≤ 5 buttons per row, ≤ 25 options, labels truncated. */
export function toComponents(rows: ComponentRow[]): unknown[] {
  return rows.slice(0, LIMIT.rows).map((row) => ({
    type: COMPONENT.ACTION_ROW,
    components:
      "select" in row
        ? [selectComponent(row.select)]
        : row.buttons.slice(0, LIMIT.buttonsPerRow).map(buttonComponent),
  }));
}

/** Legacy shape kept for `OutgoingMessage.buttons`: chunks buttons 5 by 5. */
export function buttonRows(buttons: MessageButton[]): ComponentRow[] {
  const rows: ComponentRow[] = [];
  for (let i = 0; i < buttons.length; i += LIMIT.buttonsPerRow) rows.push({ buttons: buttons.slice(i, i + LIMIT.buttonsPerRow) });
  return rows;
}

/** `{name,value}[]` (autocomplete choices) → select options, with the chosen one flagged. */
export function toOptions(choices: { name: string; value: string }[], selected: string | null, none?: string): SelectOption[] {
  // « — aucune — » gets its own reserved slot, so it never costs a real choice
  // that a blind `slice(0, 25)` on the concatenation would have dropped.
  const room = LIMIT.options - (none === undefined ? 0 : 1);
  const options: SelectOption[] = none === undefined ? [] : [{ label: none, value: NONE, default: !selected }];
  for (const c of choices.slice(0, room)) options.push({ label: c.name, value: c.value, default: c.value === selected });
  return options;
}

// ---------------------------------------------------------------------------
// modals
// ---------------------------------------------------------------------------

export type TextInput = {
  customId: string;
  label: string;
  style?: 1 | 2;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  value?: string;
};

/** `data` of an InteractionResponseType.MODAL (9) response. */
export function modalPayload(m: { customId: string; title: string; inputs: TextInput[] }): unknown {
  return {
    custom_id: cut(m.customId, LIMIT.customId),
    title: cut(m.title, LIMIT.modalTitle),
    components: m.inputs.slice(0, LIMIT.rows).map((i) => ({
      type: COMPONENT.ACTION_ROW,
      components: [
        {
          type: COMPONENT.TEXT_INPUT,
          custom_id: cut(i.customId, LIMIT.customId),
          label: cut(i.label, LIMIT.inputLabel),
          style: i.style ?? TEXT_STYLE.SHORT,
          required: i.required ?? true,
          min_length: i.minLength,
          max_length: i.maxLength,
          placeholder: i.placeholder === undefined ? undefined : cut(i.placeholder, LIMIT.placeholder),
          value: i.value,
        },
      ],
    })),
  };
}

type MaybeComponent = { custom_id?: unknown; value?: unknown; components?: unknown; component?: unknown };

/**
 * MODAL_SUBMIT `data.components` → `{ titre: "…", auteur: "…", pages: "312" }`.
 * Walks nested `components` so a future Components-v2 label wrapper still parses.
 */
export function modalValues(data: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!node || typeof node !== "object") return;
    const c = node as MaybeComponent;
    if (typeof c.custom_id === "string" && typeof c.value === "string") out[c.custom_id] = c.value;
    if (c.components) walk(c.components);
    if (c.component) walk(c.component);
  };
  walk((data as { components?: unknown } | null)?.components ?? data);
  return out;
}
