import { describe, expect, it } from "vitest";
import {
  BOOK_MODAL_ID,
  LIMIT,
  MODAL_FIELD,
  NONE,
  bookId,
  buttonRows,
  modalPayload,
  modalValues,
  parseBookId,
  toComponents,
  toOptions,
} from "./components";

/** A cuid is 25 characters — the longest thing we ever put in a custom id. */
const CUID = "cm3q8w7x50000abcdefghijkl";

type Row = { type: number; components: { type: number; custom_id?: string; label?: string; options?: { label: string; value: string; default?: boolean }[] }[] };

describe("composants Discord", () => {
  it("construit et relit un identifiant de bouton", () => {
    expect(CUID).toHaveLength(25);
    const id = bookId("save", CUID);
    expect(id).toBe(`book:save:${CUID}`);
    expect(id.length).toBeLessThanOrEqual(LIMIT.customId);
    expect(parseBookId(id)).toEqual({ action: "save", pendingId: CUID });
    expect(parseBookId(bookId("new"))).toEqual({ action: "new", pendingId: null });
    expect(parseBookId("vote:x:y")).toBeNull();
  });

  it("refuse une action inconnue", () => {
    expect(parseBookId("book:zzz:1")).toBeNull();
    expect(parseBookId("book")).toBeNull();
    expect(parseBookId("book:save:a:b")).toBeNull();
    expect(parseBookId("")).toBeNull();
  });

  it("plafonne les menus à 25 options et tronque les libellés", () => {
    const choices = Array.from({ length: 40 }, (_, i) => ({ name: `Quête ${i} ${"x".repeat(200)}`, value: `q${i}` }));
    const options = toOptions(choices, null);
    expect(options).toHaveLength(LIMIT.options);

    const [row] = toComponents([{ select: { customId: bookId("quest", CUID), options, placeholder: "Quête" } }]) as Row[];
    const select = row.components[0];
    expect(select.options).toHaveLength(LIMIT.options);
    for (const o of select.options!) expect(o.label.length).toBeLessThanOrEqual(LIMIT.selectLabel);
  });

  it("marque l'option choisie et ajoute « — aucune — »", () => {
    const choices = [
      { name: "Quête 1", value: "q1" },
      { name: "Quête 2", value: "q2" },
    ];
    const options = toOptions(choices, "q2", "— aucune —");
    expect(options[0].value).toBe(NONE);
    expect(options.filter((o) => o.default)).toHaveLength(1);
    expect(options.find((o) => o.default)!.value).toBe("q2");

    // Rien de choisi : c'est « — aucune — » qui porte la coche.
    expect(toOptions(choices, null, "— aucune —")[0].default).toBe(true);
  });

  it("range les boutons par lignes de cinq", () => {
    const buttons = Array.from({ length: 7 }, (_, i) => ({ customId: `b${i}`, label: `Bouton ${i}` }));
    const rows = buttonRows(buttons);
    expect(rows).toHaveLength(2);

    const payload = toComponents(rows) as Row[];
    expect(payload[0].components).toHaveLength(5);
    expect(payload[1].components).toHaveLength(2);
    expect(payload[0].components[0]).toMatchObject({ type: 2, style: 2, custom_id: "b0", label: "Bouton 0", disabled: false });
  });

  it("lit les valeurs d'un formulaire modal, même imbriqué", () => {
    const flat = {
      components: [
        { type: 1, components: [{ type: 4, custom_id: MODAL_FIELD.title, value: "Le Horla" }] },
        { type: 1, components: [{ type: 4, custom_id: MODAL_FIELD.author, value: "Maupassant" }] },
        { type: 1, components: [{ type: 4, custom_id: MODAL_FIELD.pages, value: "312" }] },
      ],
    };
    const nested = {
      components: [
        { type: 18, components: [{ type: 4, custom_id: MODAL_FIELD.title, value: "Le Horla" }] },
        { type: 18, components: [{ type: 4, custom_id: MODAL_FIELD.author, value: "Maupassant" }] },
        { type: 18, components: [{ type: 4, custom_id: MODAL_FIELD.pages, value: "312" }] },
      ],
    };
    const expected = { titre: "Le Horla", auteur: "Maupassant", pages: "312" };
    expect(modalValues(flat)).toEqual(expected);
    expect(modalValues(nested)).toEqual(expected);
    expect(modalValues(undefined)).toEqual({});
  });

  it("produit un modal valide", () => {
    const payload = modalPayload({
      customId: BOOK_MODAL_ID,
      title: "Une lecture de plus",
      inputs: [
        { customId: MODAL_FIELD.title, label: "Titre", maxLength: 200 },
        { customId: MODAL_FIELD.author, label: "Auteur ou autrice", maxLength: 120 },
        { customId: MODAL_FIELD.pages, label: "Nombre de pages", maxLength: 4, placeholder: "312" },
      ],
    }) as { custom_id: string; title: string; components: Row[] };

    expect(payload.custom_id).toBe(BOOK_MODAL_ID);
    expect(payload.title.length).toBeLessThanOrEqual(LIMIT.modalTitle);
    expect(payload.components.length).toBeLessThanOrEqual(LIMIT.rows);
    for (const row of payload.components) {
      expect(row.type).toBe(1);
      const input = row.components[0];
      expect(input.type).toBe(4);
      expect(input.custom_id).toBeTruthy();
      expect(input.label!.length).toBeLessThanOrEqual(LIMIT.inputLabel);
    }
    expect(modalValues(payload)).toEqual({});
  });
});
