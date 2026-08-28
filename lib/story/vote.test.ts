import { describe, expect, it } from "vitest";
import { canBreakTie, quorumFor, resolveVote, tieCascadeStage, unmetConditions } from "./vote";
import { needsTargetTeam, parseEffects } from "./effects";

const d = (s: string) => new Date(s);
const base = { choiceIds: ["a", "b", "c"], defaultChoiceId: "b", eligibleCount: 3, deadline: d("2026-09-10"), now: d("2026-09-05") };
const ballot = (userId: string, choiceId: string) => ({ userId, choiceId, createdAt: d("2026-09-05") });

describe("resolveVote", () => {
  it("waits while the deadline is ahead and votes are missing", () => {
    const r = resolveVote({ ...base, ballots: [ballot("u1", "a")] });
    expect(r).toMatchObject({ status: "pending", reason: "quorum" });
  });
  it("resolves early when everyone voted with a clear majority", () => {
    const r = resolveVote({ ...base, ballots: [ballot("u1", "a"), ballot("u2", "a"), ballot("cap", "b")] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "a", how: "majority" });
  });
  it("resolves at the deadline with a majority and quorum", () => {
    const r = resolveVote({ ...base, now: d("2026-09-11"), ballots: [ballot("u1", "c"), ballot("u2", "c"), ballot("cap", "a")] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "c", how: "majority" });
  });
  it("applies the default choice at the deadline without quorum", () => {
    const r = resolveVote({ ...base, now: d("2026-09-11"), ballots: [ballot("u1", "c")] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "b", how: "default" });
  });
  it("applies the default choice at the deadline on a tie", () => {
    const r = resolveVote({ ...base, eligibleCount: 4, now: d("2026-09-11"), ballots: [ballot("u1", "a"), ballot("u2", "a"), ballot("u3", "c"), ballot("cap", "c")] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "b", how: "default" });
  });
  it("falls back to the first choice when no default is set and nobody voted", () => {
    const r = resolveVote({ ...base, defaultChoiceId: null, now: d("2026-09-11"), ballots: [] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "a", how: "default" });
  });
  it("starts the tie cascade when everyone voted and it is tied", () => {
    const r = resolveVote({ ...base, eligibleCount: 4, ballots: [ballot("u1", "a"), ballot("u2", "a"), ballot("u3", "c"), ballot("cap", "c")] });
    expect(r).toMatchObject({ status: "tie", leaders: ["a", "c"] });
  });
  it("lowers the quorum to the team size", () => {
    expect(quorumFor(2)).toBe(2);
    expect(quorumFor(10)).toBe(3);
    const r = resolveVote({ ...base, eligibleCount: 2, ballots: [ballot("u1", "a"), ballot("u2", "a")] });
    expect(r).toMatchObject({ status: "resolved", choiceId: "a" });
  });
});

describe("tieCascadeStage", () => {
  // Monday 2026-09-07 10:00 Paris = 08:00Z
  const since = d("2026-09-07T08:00:00Z");
  it("captain for 5 h, deputy for 5 more, then anyone", () => {
    expect(tieCascadeStage(since, d("2026-09-07T12:59:00Z"))).toBe("CAPTAIN");
    expect(tieCascadeStage(since, d("2026-09-07T13:00:00Z"))).toBe("DEPUTY");
    expect(tieCascadeStage(since, d("2026-09-07T18:00:00Z"))).toBe("ANY");
  });
  it("freezes the timers between 00:00 and 08:00 Paris", () => {
    // Tie at 22:00 Paris (20:00Z): 2 h before midnight, then 3 h from 08:00 → deputy from 11:00 Paris (09:00Z)
    const night = d("2026-09-07T20:00:00Z");
    expect(tieCascadeStage(night, d("2026-09-08T08:59:00Z"))).toBe("CAPTAIN");
    expect(tieCascadeStage(night, d("2026-09-08T09:00:00Z"))).toBe("DEPUTY");
  });
  it("checks who may act", () => {
    expect(canBreakTie("CAPTAIN", "deputy")).toBe(false);
    expect(canBreakTie("DEPUTY", "deputy")).toBe(true);
    expect(canBreakTie("DEPUTY", "member")).toBe(false);
    expect(canBreakTie("ANY", "member")).toBe(true);
    expect(canBreakTie("CAPTAIN", "admin")).toBe(true);
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
