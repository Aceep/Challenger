import { describe, expect, it } from "vitest";
import { resolveVote, unmetConditions } from "./vote";
import { needsTargetTeam, parseEffects } from "./effects";

const d = (s: string) => new Date(s);
const base = { choiceIds: ["a", "b", "c"], captainId: "cap", eligibleCount: 3, deadline: d("2026-09-10"), now: d("2026-09-05") };
const ballot = (userId: string, choiceId: string) => ({ userId, choiceId, createdAt: d("2026-09-05") });

describe("resolveVote", () => {
  it("waits while the deadline is ahead and votes are missing", () => {
    const r = resolveVote({ ...base, ballots: [ballot("u1", "a")] });
    expect(r.status).toBe("pending");
  });
  it("resolves early when everyone voted", () => {
    const r = resolveVote({ ...base, ballots: [ballot("u1", "a"), ballot("u2", "a"), ballot("cap", "b")] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "a", tieBreak: "none" });
  });
  it("resolves at the deadline with partial ballots", () => {
    const r = resolveVote({ ...base, now: d("2026-09-11"), ballots: [ballot("u1", "c")] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "c" });
  });
  it("breaks ties with the captain's ballot", () => {
    const r = resolveVote({ ...base, now: d("2026-09-11"), ballots: [ballot("u1", "a"), ballot("cap", "b")] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "b", tieBreak: "captain" });
  });
  it("falls back to choice order when the captain did not vote", () => {
    const r = resolveVote({ ...base, now: d("2026-09-11"), ballots: [ballot("u1", "c"), ballot("u2", "b")] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "b", tieBreak: "order" });
  });
  it("picks the first choice when nobody voted after the deadline", () => {
    const r = resolveVote({ ...base, now: d("2026-09-11"), ballots: [] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "a", tieBreak: "order" });
  });
});

describe("unmetConditions", () => {
  it("lists every unmet condition", () => {
    const out = unmetConditions(
      { requiredQuestId: "q1", requiredBingoLines: 2, requiredPoints: 100 },
      { completedQuestIds: [], bingoLines: 1, points: 50 },
      "Lire un classique",
    );
    expect(out).toHaveLength(3);
    expect(out[0]).toContain("Lire un classique");
  });
  it("is empty when satisfied", () => {
    expect(unmetConditions({ requiredQuestId: "q1", requiredBingoLines: null, requiredPoints: null }, { completedQuestIds: ["q1"], bingoLines: 0, points: 0 })).toEqual([]);
  });
});

describe("effects", () => {
  it("parses valid effects and drops invalid JSON", () => {
    expect(parseEffects([{ type: "points", amount: 10 }])).toEqual([{ type: "points", target: "self", amount: 10 }]);
    expect(parseEffects([{ type: "nope" }])).toEqual([]);
    expect(parseEffects("garbage")).toEqual([]);
  });
  it("detects when a rival must be chosen", () => {
    expect(needsTargetTeam(parseEffects([{ type: "points", amount: 10 }]))).toBe(false);
    expect(needsTargetTeam(parseEffects([{ type: "steal", amount: 10 }]))).toBe(true);
    expect(needsTargetTeam(parseEffects([{ type: "modifier", target: "chosen", multiplier: 0.5, days: 2 }]))).toBe(true);
  });
});
