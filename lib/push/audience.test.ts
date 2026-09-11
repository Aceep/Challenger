import { describe, expect, it } from "vitest";
import { affectedRecipients, affectedTeams, awaitingTargetRecipients, tieStageRecipients } from "./audience";

const team = { captainId: "cap", deputyId: "dep" };
const audience = ["cap", "dep", "member", "ally"];

describe("tieStageRecipients", () => {
  it("rings one phone at a time while the cascade is still personal", () => {
    expect(tieStageRecipients(team, "CAPTAIN", audience)).toEqual(["cap"]);
    expect(tieStageRecipients(team, "DEPUTY", audience)).toEqual(["dep"]);
  });

  it("opens up to the whole audience once anybody may break the tie", () => {
    expect(tieStageRecipients(team, "ANY", audience)).toEqual(audience);
  });

  it("tells nobody rather than guessing when the seat is empty", () => {
    expect(tieStageRecipients({ captainId: null, deputyId: null }, "CAPTAIN", audience)).toEqual([]);
    expect(tieStageRecipients({ captainId: "cap", deputyId: null }, "DEPUTY", audience)).toEqual([]);
  });

  it("never notifies the same person twice at stage ANY", () => {
    expect(tieStageRecipients(team, "ANY", ["a", "b", "a"])).toEqual(["a", "b"]);
  });
});

describe("awaitingTargetRecipients", () => {
  it("asks the captain and warns the deputy", () => {
    expect(awaitingTargetRecipients(team)).toEqual(["cap", "dep"]);
  });

  it("copes with a team that has no deputy yet", () => {
    expect(awaitingTargetRecipients({ captainId: "cap", deputyId: null })).toEqual(["cap"]);
    expect(awaitingTargetRecipients({ captainId: null, deputyId: null })).toEqual([]);
  });

  it("does not notify a captain who is also the deputy twice", () => {
    expect(awaitingTargetRecipients({ captainId: "cap", deputyId: "cap" })).toEqual(["cap"]);
  });
});

describe("affectedTeams", () => {
  it("keeps the rivals and drops the team that played the chapter", () => {
    expect(affectedTeams({ teamId: "t1", affectedTeamIds: ["t2", "t1", "t3", "t2"] })).toEqual(["t2", "t3"]);
  });

  it("is empty when the effects only touched the team itself", () => {
    expect(affectedTeams({ teamId: "t1", affectedTeamIds: ["t1"] })).toEqual([]);
    expect(affectedTeams({ teamId: "t1", affectedTeamIds: [] })).toEqual([]);
  });
});

describe("affectedRecipients", () => {
  it("skips the people already told as the voting team's audience", () => {
    expect(affectedRecipients(["ally", "rival"], audience)).toEqual(["rival"]);
  });

  it("deduplicates the members of two affected teams", () => {
    expect(affectedRecipients(["a", "b", "a"], [])).toEqual(["a", "b"]);
  });
});
