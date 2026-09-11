import { describe, expect, it } from "vitest";
import { PUSH_CATEGORIES, PUSH_CATEGORY_LABELS, isPushCategory } from "./categories";

describe("isPushCategory", () => {
  it.each(PUSH_CATEGORIES)("accepts %s", (category) => {
    expect(isPushCategory(category)).toBe(true);
  });

  it.each([["story"], ["READING"], [""], [null], [undefined], [42], [{ STORY: true }], [["STORY"]]])("refuses %o", (value) => {
    expect(isPushCategory(value)).toBe(false);
  });
});

describe("PUSH_CATEGORY_LABELS", () => {
  it("has a label and a hint for every category", () => {
    for (const category of PUSH_CATEGORIES) {
      const { label, hint } = PUSH_CATEGORY_LABELS[category];
      expect(label.length).toBeGreaterThan(0);
      expect(hint.length).toBeGreaterThan(0);
    }
  });

  it("spells the French apostrophe with a curly one", () => {
    for (const category of PUSH_CATEGORIES) {
      expect(PUSH_CATEGORY_LABELS[category].hint).not.toMatch(/'/);
    }
    expect(PUSH_CATEGORY_LABELS.QUESTIONS.hint).toContain("l’organisation");
  });
});
