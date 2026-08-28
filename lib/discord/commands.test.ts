import { describe, expect, it } from "vitest";
import { SLASH_COMMANDS } from "./commands";

describe("commandes slash", () => {
  it("respecte les contraintes de l'API Discord", () => {
    expect(SLASH_COMMANDS.length).toBeGreaterThan(0);
    const names = new Set<string>();
    for (const c of SLASH_COMMANDS) {
      expect(c.name, c.name).toMatch(/^[a-z-]{1,32}$/);
      expect(names.has(c.name), `${c.name} en double`).toBe(false);
      names.add(c.name);
      expect(c.description.length, c.name).toBeGreaterThan(0);
      expect(c.description.length, c.name).toBeLessThanOrEqual(100);

      const options = c.options ?? [];
      expect(options.length, c.name).toBeLessThanOrEqual(25);
      const optionNames = new Set<string>();
      let optional = false;
      for (const o of options) {
        expect(o.name, `${c.name}/${o.name}`).toMatch(/^[a-z-]{1,32}$/);
        expect(optionNames.has(o.name), `${c.name}/${o.name} en double`).toBe(false);
        optionNames.add(o.name);
        expect(o.description.length, `${c.name}/${o.name}`).toBeLessThanOrEqual(100);
        // Discord refuses a required option after an optional one.
        if (o.required) expect(optional, `${c.name}/${o.name} après une option facultative`).toBe(false);
        else optional = true;
      }
    }
  });

  it("expose les commandes de lecture attendues", () => {
    const names = SLASH_COMMANDS.map((c) => c.name);
    expect(names).toContain("ajouter-un-livre");
    expect(names).toContain("modifier-un-livre");
    expect(names).toContain("help");
  });
});
