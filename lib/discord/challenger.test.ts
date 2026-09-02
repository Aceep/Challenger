import { describe, expect, it } from "vitest";
import { CHALLENGER_COMMAND, GLOBAL_COMMANDS, hasManageGuild, parseChallengerInteraction } from "./challenger";

describe("permission « Gérer le serveur »", () => {
  it("accepte le bit MANAGE_GUILD et le bit ADMINISTRATOR", () => {
    expect(hasManageGuild("32")).toBe(true);
    expect(hasManageGuild("8")).toBe(true);
    // Permissions réelles d'un·e admin : un grand entier 64 bits.
    expect(hasManageGuild("2251799813685247")).toBe(true);
  });

  it("refuse un membre ordinaire", () => {
    expect(hasManageGuild("0")).toBe(false);
    // Lire + écrire + réagir, rien de plus.
    expect(hasManageGuild(String(2 ** 10 + 2 ** 11 + 2 ** 6))).toBe(false);
  });

  it("refuse une valeur absente ou illisible", () => {
    expect(hasManageGuild()).toBe(false);
    expect(hasManageGuild(null)).toBe(false);
    expect(hasManageGuild("")).toBe(false);
    expect(hasManageGuild("abc")).toBe(false);
  });
});

describe("commande /challenger", () => {
  it("est une commande de serveur, avec la seule sous-commande « creer »", () => {
    expect(CHALLENGER_COMMAND.name).toBe("challenger");
    expect(CHALLENGER_COMMAND.dm_permission).toBe(false);
    // On ne rejoint plus un défi soi-même : l'invitation est le seul chemin d'entrée.
    expect(CHALLENGER_COMMAND.options?.map((o) => o.name)).toEqual(["creer"]);
    for (const o of CHALLENGER_COMMAND.options ?? []) expect(o.type, o.name).toBe(1);
    expect(JSON.stringify(CHALLENGER_COMMAND)).not.toContain("rejoindre");
  });

  it("demande un nom pour la création", () => {
    const creer = CHALLENGER_COMMAND.options?.[0];
    expect(creer?.options?.[0]).toMatchObject({ name: "nom", required: true, max_length: 100 });
  });

  it("est la seule commande enregistrée globalement", () => {
    expect(GLOBAL_COMMANDS.map((c) => c.name)).toEqual(["challenger"]);
  });
});

describe("lecture d'une interaction /challenger", () => {
  it("lit la création et son nom", () => {
    expect(parseChallengerInteraction([{ name: "creer", type: 1, options: [{ name: "nom", type: 3, value: "  Défi d’automne  " }] }])).toEqual({
      sub: "creer",
      name: "Défi d’automne",
    });
  });

  it("rend un nom vide quand l'option manque, pour laisser le repli jouer", () => {
    expect(parseChallengerInteraction([{ name: "creer", type: 1 }])).toEqual({ sub: "creer", name: "" });
    expect(parseChallengerInteraction([{ name: "creer", type: 1, options: [{ name: "nom", type: 3, value: "   " }] }])).toEqual({ sub: "creer", name: "" });
  });

  // Tant que les commandes globales ne sont pas ré-enregistrées, Discord
  // continue d'afficher « rejoindre » : elle doit se lire comme une
  // sous-commande inconnue, que la route explique au lieu de planter.
  it("rend null sur l'ancienne sous-commande « rejoindre »", () => {
    expect(parseChallengerInteraction([{ name: "rejoindre", type: 1 }])).toBeNull();
  });

  it("rend null sur une charge utile inattendue", () => {
    expect(parseChallengerInteraction()).toBeNull();
    expect(parseChallengerInteraction([])).toBeNull();
    expect(parseChallengerInteraction([{ name: "autre", type: 1 }])).toBeNull();
  });
});
