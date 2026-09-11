import { describe, expect, it } from "vitest";
import { INVITE_COMMAND, MAX_INVITES, MEMBER_OPTIONS, NO_BOTS, parseInviteInteraction } from "./invite-command";

const USER = 6;
const STRING = 3;

const opt = (name: string, value: string) => ({ name, value });

describe("/inviter", () => {
  it("ouvre cinq emplacements de membre, le premier obligatoire", () => {
    const members = INVITE_COMMAND.options!.filter((o) => o.type === USER);
    expect(members).toHaveLength(MAX_INVITES);
    expect(members[0].required).toBe(true);
    for (const o of members.slice(1)) expect(o.required ?? false).toBe(false);
    expect(members.map((o) => o.name)).toEqual(MEMBER_OPTIONS);
  });

  it("autocomplète l'équipe et propose les deux rôles", () => {
    const equipe = INVITE_COMMAND.options!.find((o) => o.name === "equipe");
    expect(equipe?.type).toBe(STRING);
    expect(equipe?.autocomplete).toBe(true);
    const role = INVITE_COMMAND.options!.find((o) => o.name === "role");
    expect(role?.choices?.map((c) => c.value)).toEqual(["PLAYER", "ORGANIZER"]);
  });

  it("ne se cache derrière aucune permission Discord : le droit est celui du défi", () => {
    // Un·e co-organisateur·ice n'a pas forcément « Gérer le serveur ».
    expect(INVITE_COMMAND.default_member_permissions).toBeUndefined();
  });

  it("lit les membres dans l'ordre, avec l'équipe et le rôle", () => {
    const parsed = parseInviteInteraction([opt("membre1", "111"), opt("membre3", "333"), opt("equipe", "team-1"), opt("role", "ORGANIZER")]);
    expect(parsed).toEqual({ ok: true, data: { discordIds: ["111", "333"], teamId: "team-1", role: "ORGANIZER" } });
  });

  it("dédoublonne : la même personne nommée deux fois reste une invitation", () => {
    const parsed = parseInviteInteraction([opt("membre1", "111"), opt("membre2", "111")]);
    expect(parsed.ok && parsed.data.discordIds).toEqual(["111"]);
  });

  it("par défaut : joueur·euse, sans équipe", () => {
    const parsed = parseInviteInteraction([opt("membre1", "111")]);
    expect(parsed.ok && parsed.data).toEqual({ discordIds: ["111"], teamId: null, role: "PLAYER" });
  });

  it("refuse les bots, nommément", () => {
    const parsed = parseInviteInteraction([opt("membre1", "111"), opt("membre2", "999")], { users: { "111": { id: "111" }, "999": { id: "999", bot: true } } });
    expect(parsed).toEqual({ ok: false, error: NO_BOTS });
  });

  it("refuse une commande sans personne", () => {
    const empty = parseInviteInteraction([opt("equipe", "team-1")]);
    expect(empty.ok).toBe(false);
    expect(parseInviteInteraction().ok).toBe(false);
  });

  it("ignore une équipe vide plutôt que d'inventer un identifiant", () => {
    const parsed = parseInviteInteraction([opt("membre1", "111"), opt("equipe", "   ")]);
    expect(parsed.ok && parsed.data.teamId).toBeNull();
  });
});
