import { describe, expect, it } from "vitest";
import { CHALLENGE_COOKIE, pickChallengeForGuild, pickCurrentMembership } from "./select";

const challenge = (id: string, status: "DRAFT" | "ACTIVE" | "FINISHED", startAt: string) => ({ id, status, startAt: new Date(startAt) });
const member = (c: ReturnType<typeof challenge>, role: "ORGANIZER" | "PLAYER" = "PLAYER") => ({ challengeId: c.id, role, challenge: c });

const active = challenge("c_active", "ACTIVE", "2026-01-01");
const finished = challenge("c_old", "FINISHED", "2025-01-01");
const draft = challenge("c_next", "DRAFT", "2027-01-01");

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
