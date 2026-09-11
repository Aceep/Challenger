import { describe, expect, it } from "vitest";
import { DECORATION } from "@/components/ui/Rich";
import { ORGANIZER_STEPS, PLAYER_STEPS, type GuideStep } from "./steps";

const ALL: GuideStep[] = [...ORGANIZER_STEPS, ...PLAYER_STEPS];
/** Anything that reads as a slash command in the prose: `/challenger`, `/ajouter-un-livre`… */
const COMMAND = /\/[a-z][a-z-]*/g;

describe("étapes du guide", () => {
  it("donne deux parcours non vides", () => {
    expect(ORGANIZER_STEPS.length).toBeGreaterThan(3);
    expect(PLAYER_STEPS.length).toBeGreaterThan(3);
    for (const s of ALL) {
      expect(s.title.length, s.id).toBeGreaterThan(0);
      expect(s.lines.length, s.id).toBeGreaterThan(0);
      for (const l of s.lines) expect(l.trim().length, s.id).toBeGreaterThan(0);
    }
  });

  it("garde des identifiants uniques : ce sont les ancres de la page", () => {
    const ids = ALL.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("n'écrit aucun emoji : les pages web portent le ton par la typographie", () => {
    for (const s of ALL) {
      expect(s.title.match(DECORATION), s.id).toBeNull();
      for (const l of s.lines) expect(l.match(DECORATION), `${s.id} : ${l}`).toBeNull();
      for (const c of s.commands ?? []) expect(c.match(DECORATION), s.id).toBeNull();
    }
  });

  it("liste dans `commands` chaque commande citée par le texte", () => {
    for (const s of ALL) {
      for (const l of s.lines) {
        for (const quoted of l.match(COMMAND) ?? []) {
          expect(s.commands ?? [], `${s.id} cite ${quoted} sans le lister`).toEqual(expect.arrayContaining([expect.stringMatching(new RegExp(`^${quoted}\\b`))]));
        }
      }
    }
  });

  it("ne promet une capture que si elle est nommée, et toujours avec son texte alternatif", () => {
    for (const s of ALL) {
      if (!s.screenshot) {
        expect(s.screenshotAlt, s.id).toBeUndefined();
        continue;
      }
      // Convention : les captures vivent dans `public/guide/`, une par étape.
      expect(s.screenshot, s.id).toBe(`/guide/${s.id}.png`);
      expect(s.screenshotAlt?.length ?? 0, s.id).toBeGreaterThan(0);
    }
  });
});
