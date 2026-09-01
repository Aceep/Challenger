import { describe, expect, it } from "vitest";
import { GLOBAL_COMMANDS } from "./challenger";
import { SLASH_COMMANDS, type SlashCommand, type SlashOption } from "./commands";

const SUB_COMMAND = 1;

/**
 * Discord's rules on an option list, applied to a command and to each of its
 * sub-commands: unique lowercase names, descriptions under 100 characters, no
 * required option after an optional one, and never a sub-command mixed with
 * plain options.
 */
function checkOptions(where: string, options: SlashOption[] = []) {
  expect(options.length, where).toBeLessThanOrEqual(25);
  const subs = options.filter((o) => o.type === SUB_COMMAND).length;
  expect(subs === 0 || subs === options.length, `${where} mélange sous-commandes et options`).toBe(true);

  const names = new Set<string>();
  let optional = false;
  for (const o of options) {
    const path = `${where}/${o.name}`;
    expect(o.name, path).toMatch(/^[a-z-]{1,32}$/);
    expect(names.has(o.name), `${path} en double`).toBe(false);
    names.add(o.name);
    expect(o.description.length, path).toBeGreaterThan(0);
    expect(o.description.length, path).toBeLessThanOrEqual(100);
    // Discord refuses a required option after an optional one — inside a
    // sub-command too, which checks its own sequence.
    if (o.required) expect(optional, `${path} après une option facultative`).toBe(false);
    else optional = true;
    if (o.type === SUB_COMMAND) checkOptions(path, o.options);
  }
}

function checkCommands(list: SlashCommand[]) {
  expect(list.length).toBeGreaterThan(0);
  const names = new Set<string>();
  for (const c of list) {
    expect(c.name, c.name).toMatch(/^[a-z-]{1,32}$/);
    expect(names.has(c.name), `${c.name} en double`).toBe(false);
    names.add(c.name);
    expect(c.description.length, c.name).toBeGreaterThan(0);
    expect(c.description.length, c.name).toBeLessThanOrEqual(100);
    checkOptions(c.name, c.options);
  }
}

describe("commandes slash", () => {
  it("respecte les contraintes de l'API Discord", () => {
    checkCommands(SLASH_COMMANDS);
  });

  it("applique les mêmes contrôles aux commandes globales", () => {
    checkCommands(GLOBAL_COMMANDS);
  });

  it("expose les commandes de lecture attendues", () => {
    const names = SLASH_COMMANDS.map((c) => c.name);
    expect(names).toContain("ajouter-un-livre");
    expect(names).toContain("modifier-un-livre");
    expect(names).toContain("help");
  });

  it("garde /challenger hors du jeu par serveur, pour ne pas le déclarer deux fois", () => {
    expect(GLOBAL_COMMANDS.map((c) => c.name)).toEqual(["challenger"]);
    expect(SLASH_COMMANDS.map((c) => c.name)).not.toContain("challenger");
  });

  it("déclare /bingo par serveur, sans option : elle répond sur l'équipe de qui la tape", () => {
    const bingo = SLASH_COMMANDS.find((c) => c.name === "bingo");
    expect(bingo).toBeDefined();
    expect(bingo?.options ?? []).toEqual([]);
    expect(GLOBAL_COMMANDS.map((c) => c.name)).not.toContain("bingo");
  });
});
