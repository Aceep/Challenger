import { describe, expect, it } from "vitest";
import {
  DEFAULT_TTL,
  awaitingTargetPayload,
  effectsOnYouPayload,
  excerpt,
  playerRepliedPayload,
  questionAnsweredPayload,
  questionAskedPayload,
  testPayload,
  tiePendingPayload,
  tieStagePayload,
  voteOpenedPayload,
  voteResolvedPayload,
  type PushPayload,
} from "./payload";

const NNBSP = " ";
const NBSP = " ";

describe("excerpt", () => {
  it("leaves a short text alone", () => {
    expect(excerpt("Une question courte")).toBe("Une question courte");
  });
  it("collapses whitespace and newlines", () => {
    expect(excerpt("Deux   lignes\n\net un  espace")).toBe("Deux lignes et un espace");
  });
  it("cuts on a word boundary and ends with an ellipsis", () => {
    const cut = excerpt("abcdef ghijkl mnopqr stuvwx", 14);
    expect(cut).toBe("abcdef ghijkl…");
    expect(cut.length).toBeLessThanOrEqual(15);
  });
  it("cuts mid-word rather than losing everything on a single long word", () => {
    expect(excerpt("anticonstitutionnellement", 10)).toBe("anticonsti…");
  });
});

describe("voteOpenedPayload", () => {
  const now = new Date("2026-09-11T10:00:00Z");

  it("points at the story, tagged by vote, and lives as long as the vote", () => {
    const payload = voteOpenedPayload({ voteId: "v1", chapterTitle: "La porte close", deadline: new Date("2026-09-11T12:00:00Z"), now });
    expect(payload.category).toBe("STORY");
    expect(payload.url).toBe("/story");
    expect(payload.tag).toBe("vote:v1");
    expect(payload.ttl).toBe(7200);
    expect(payload.body).toContain(`«${NNBSP}La porte close${NNBSP}»`);
    expect(payload.title).toBe(`Un vote est ouvert${NBSP}!`);
  });

  it("never drops under a minute, even past the deadline", () => {
    const late = voteOpenedPayload({ voteId: "v1", chapterTitle: "Trop tard", deadline: new Date("2026-09-11T09:00:00Z"), now });
    expect(late.ttl).toBe(60);
  });
});

describe("voteResolvedPayload", () => {
  it("names the next chapter when there is one", () => {
    const payload = voteResolvedPayload({ voteId: "v2", choiceLabel: "Fuir", nextChapterTitle: "Le pont" });
    expect(payload).toMatchObject({ category: "STORY", url: "/story", tag: "vote:v2", ttl: DEFAULT_TTL });
    expect(payload.body).toContain(`«${NNBSP}Fuir${NNBSP}»`);
    expect(payload.body).toContain("Le pont");
  });
  it("says the story stops when the branch ends", () => {
    const payload = voteResolvedPayload({ voteId: "v2", choiceLabel: "Fuir", nextChapterTitle: null });
    expect(payload.body).toContain("s’arrête là");
  });
});

describe("the other story payloads", () => {
  it("awaitingTargetPayload asks for a rival team", () => {
    const payload = awaitingTargetPayload({ voteId: "v3", choiceLabel: "Voler des points" });
    expect(payload).toMatchObject({ category: "STORY", url: "/story", tag: "vote:v3", ttl: DEFAULT_TTL });
    expect(payload.body).toContain(`«${NNBSP}Voler des points${NNBSP}»`);
  });

  it.each([
    ["CAPTAIN", "capitaine"],
    ["DEPUTY", "adjoint·e"],
    ["ANY", "n’importe qui"],
  ] as const)("tieStagePayload (%s) names who may decide", (stage, expected) => {
    const payload = tieStagePayload({ voteId: "v4", stage });
    expect(payload).toMatchObject({ category: "STORY", url: "/story", tag: "vote:v4", ttl: DEFAULT_TTL });
    expect(payload.body).toContain(expected);
  });

  it("tiePendingPayload is for the organisation, not the team", () => {
    const payload = tiePendingPayload({ voteId: "v5", teamName: "Les Marque-pages", choiceLabel: "Ouvrir le coffre" });
    expect(payload).toMatchObject({ category: "ORGANIZER", url: "/story", tag: "vote:v5" });
    expect(payload.body).toContain("Les Marque-pages");
  });

  it("effectsOnYouPayload sends to the team page", () => {
    const payload = effectsOnYouPayload({ voteId: "v6", teamName: "Les Signets", summary: "vous perdez 10 points" });
    expect(payload).toMatchObject({ category: "STORY", url: "/team", tag: "vote:v6" });
    expect(payload.body).toContain("Les Signets");
  });
});

describe("the question payloads", () => {
  it("questionAskedPayload goes to the organisation", () => {
    const payload = questionAskedPayload({ questionId: "q1", title: "Peut-on relire un livre ?", authorName: "Alix" });
    expect(payload).toMatchObject({ category: "ORGANIZER", url: "/faq/q1", tag: "question:q1", ttl: DEFAULT_TTL });
    expect(payload.body).toContain("Alix");
  });

  it("questionAnsweredPayload goes back to the person who asked", () => {
    const payload = questionAnsweredPayload({ questionId: "q2", title: "Les BD comptent-elles ?", excerpt: "Oui, pour une demi-unité." });
    expect(payload).toMatchObject({ category: "QUESTIONS", url: "/faq/q2", tag: "question:q2" });
    expect(payload.body).toContain("Oui, pour une demi-unité.");
  });

  it("playerRepliedPayload goes to the organisation", () => {
    const payload = playerRepliedPayload({ questionId: "q3", title: "Une question", authorName: "Sam" });
    expect(payload).toMatchObject({ category: "ORGANIZER", url: "/faq/q3", tag: "question:q3" });
    expect(payload.body).toContain(`«${NNBSP}Une question${NNBSP}»`);
  });
});

describe("testPayload", () => {
  it("says the chain works and lands in Aide", () => {
    const payload = testPayload();
    expect(payload.title).toBe("Test réussi");
    expect(payload.url).toBe("/help#notifications");
  });
});

const ALL: PushPayload[] = [
  voteOpenedPayload({ voteId: "v", chapterTitle: "Chapitre", deadline: new Date("2026-09-12T00:00:00Z"), now: new Date("2026-09-11T00:00:00Z") }),
  voteResolvedPayload({ voteId: "v", choiceLabel: "Choix", nextChapterTitle: "Suite" }),
  voteResolvedPayload({ voteId: "v", choiceLabel: "Choix", nextChapterTitle: null }),
  awaitingTargetPayload({ voteId: "v", choiceLabel: "Choix" }),
  tieStagePayload({ voteId: "v", stage: "CAPTAIN" }),
  tieStagePayload({ voteId: "v", stage: "DEPUTY" }),
  tieStagePayload({ voteId: "v", stage: "ANY" }),
  tiePendingPayload({ voteId: "v", teamName: "Équipe", choiceLabel: "Choix" }),
  questionAskedPayload({ questionId: "q", title: "Titre", authorName: "Nom" }),
  questionAnsweredPayload({ questionId: "q", title: "Titre", excerpt: "Corps" }),
  playerRepliedPayload({ questionId: "q", title: "Titre", authorName: "Nom" }),
  effectsOnYouPayload({ voteId: "v", teamName: "Équipe", summary: "Résumé" }),
  testPayload(),
];

describe("every payload", () => {
  it("uses a relative url the service worker can resolve", () => {
    for (const payload of ALL) expect(payload.url).toMatch(/^\/[\w/#-]*$/);
  });

  it("stays well under the 4 KB a push message allows", () => {
    for (const payload of ALL) expect(new TextEncoder().encode(JSON.stringify(payload)).length).toBeLessThan(2000);
  });

  it("carries a positive ttl and a tag", () => {
    for (const payload of ALL) {
      expect(payload.ttl).toBeGreaterThan(0);
      expect(payload.tag).toBeTruthy();
    }
  });

  it("writes French typography: curly apostrophes, no straight quotes", () => {
    for (const payload of ALL) {
      expect(`${payload.title} ${payload.body}`).not.toMatch(/['"]/);
    }
  });

  it("spaces « » and the double punctuation the French way", () => {
    for (const payload of ALL) {
      const text = `${payload.title} ${payload.body}`;
      // No guillemet ever hugs its content, and no « : ! ? » ever hugs the word before.
      expect(text).not.toMatch(/«[^ ]/);
      expect(text).not.toMatch(/[^ ]»/);
      expect(text).not.toMatch(/[^ \s][:!?]/);
    }
  });
});
