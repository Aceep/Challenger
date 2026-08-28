import { describe, expect, it } from "vitest";
import { CHALLENGE_COOKIE, pickChallengeForGuild, pickCurrentMembership, sortByRelevance, switchLanding } from "./select";

const challenge = (id: string, status: "DRAFT" | "ACTIVE" | "FINISHED", startAt: string) => ({ id, status, startAt: new Date(startAt) });
const member = (c: ReturnType<typeof challenge>, role: "ORGANIZER" | "PLAYER" = "PLAYER") => ({ challengeId: c.id, role, challenge: c });

const active = challenge("c_active", "ACTIVE", "2026-01-01");
const finished = challenge("c_old", "FINISHED", "2025-01-01");
const draft = challenge("c_next", "DRAFT", "2027-01-01");

describe("sortByRelevance", () => {
  it("has nothing to sort in an empty list", () => {
    expect(sortByRelevance([])).toEqual([]);
  });
  it("puts the ACTIVE edition first, then the latest startAt", () => {
    expect(sortByRelevance([finished, draft, active]).map((c) => c.id)).toEqual(["c_active", "c_next", "c_old"]);
  });
  it("sorts anything holding a challenge, memberships included", () => {
    expect(sortByRelevance([member(finished), member(draft), member(active)]).map((m) => m.challengeId)).toEqual(["c_active", "c_next", "c_old"]);
  });
  it("does not mutate the given list", () => {
    const list = [finished, active];
    sortByRelevance(list);
    expect(list.map((c) => c.id)).toEqual(["c_old", "c_active"]);
  });
});

describe("switchLanding", () => {
  it("sends an organiser back to the admin desk when they asked for it", () => {
    expect(switchLanding("ORGANIZER", "/admin")).toBe("/admin");
  });
  it("sends an organiser home when the caller asked for the player side", () => {
    expect(switchLanding("ORGANIZER", "/home")).toBe("/home");
  });
  it("never opens the admin desk to a player, even when asked", () => {
    expect(switchLanding("PLAYER", "/admin")).toBe("/home");
  });
  it("lands home by default", () => {
    expect(switchLanding("PLAYER", "/home")).toBe("/home");
    expect(switchLanding("ORGANIZER")).toBe("/home");
    expect(switchLanding("ORGANIZER", null)).toBe("/home");
    expect(switchLanding("ORGANIZER", "/books")).toBe("/home");
  });
});

describe("pickCurrentMembership", () => {
  it("has nothing to pick without a membership", () => {
    expect(pickCurrentMembership([])).toBeNull();
    expect(pickCurrentMembership([], "c_active")).toBeNull();
  });
  it("honours the preferred challenge when the person belongs to it", () => {
    const picked = pickCurrentMembership([member(active), member(finished)], "c_old");
    expect(picked?.challengeId).toBe("c_old");
  });
  it("ignores a preferred challenge the person does not belong to", () => {
    const picked = pickCurrentMembership([member(active), member(finished)], "c_elsewhere");
    expect(picked?.challengeId).toBe("c_active");
  });
  it("prefers the ACTIVE challenge over a later draft", () => {
    expect(pickCurrentMembership([member(draft), member(active)])?.challengeId).toBe("c_active");
  });
  it("falls back on the latest startAt when none is active", () => {
    expect(pickCurrentMembership([member(finished), member(draft)])?.challengeId).toBe("c_next");
  });
  it("keeps the membership, role included", () => {
    expect(pickCurrentMembership([member(active, "ORGANIZER")])?.role).toBe("ORGANIZER");
  });
  it("does not mutate the given list", () => {
    const list = [member(finished), member(active)];
    pickCurrentMembership(list);
    expect(list[0].challengeId).toBe("c_old");
  });
});

describe("pickChallengeForGuild", () => {
  it("returns null when the guild plays no challenge", () => {
    expect(pickChallengeForGuild([])).toBeNull();
  });
  it("prefers the ACTIVE edition of the server", () => {
    expect(pickChallengeForGuild([finished, active, draft])?.id).toBe("c_active");
  });
  it("falls back on the edition that started last", () => {
    expect(pickChallengeForGuild([finished, draft])?.id).toBe("c_next");
  });
  it("picks the latest of two active editions on the same server", () => {
    const older = challenge("c_a", "ACTIVE", "2025-06-01");
    expect(pickChallengeForGuild([older, active])?.id).toBe("c_active");
  });
});

describe("CHALLENGE_COOKIE", () => {
  it("is the name read by the DAL", () => {
    expect(CHALLENGE_COOKIE).toBe("challenge");
  });
});
