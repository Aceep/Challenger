import { describe, expect, it } from "vitest";
import { dayLabel, weekActions, type WeekAction } from "./week";

const at = (iso: string) => new Date(iso);

describe("weekActions", () => {
  it("classe de la plus récente à la plus ancienne", () => {
    const actions: WeekAction[] = [
      { kind: "book", at: at("2026-09-08T09:00:00Z"), title: "Loin", points: 12.5 },
      { kind: "quest", at: at("2026-09-10T09:00:00Z"), number: 3, title: "Trois continents" },
      { kind: "cell", at: at("2026-09-09T09:00:00Z"), label: "B2", title: "Ici" },
    ];
    expect(weekActions(actions).map((a) => a.kind)).toEqual(["quest", "cell", "book"]);
  });

  it("lit le résultat avant sa cause quand tout arrive au même instant", () => {
    const now = at("2026-09-09T09:00:00Z");
    const actions: WeekAction[] = [
      { kind: "book", at: now, title: "Loin", points: 12.5 },
      { kind: "quest", at: now, number: 3, title: "Trois continents" },
      { kind: "cell", at: now, label: "B2", title: "Loin" },
    ];
    expect(weekActions(actions).map((a) => a.kind)).toEqual(["quest", "cell", "book"]);
  });

  it("ne garde que les plus récentes et ne touche pas au tableau reçu", () => {
    const actions: WeekAction[] = Array.from({ length: 8 }, (_, i) => ({
      kind: "book",
      at: at(`2026-09-0${i + 1}T09:00:00Z`),
      title: `Livre ${i + 1}`,
      points: 10,
    }));
    const kept = weekActions(actions);
    expect(kept).toHaveLength(4);
    expect(kept.map((a) => a.kind === "book" && a.title)).toEqual(["Livre 8", "Livre 7", "Livre 6", "Livre 5"]);
    expect(actions[0].kind === "book" && actions[0].title).toBe("Livre 1");
    expect(weekActions(actions, 2)).toHaveLength(2);
  });

  it("rend une liste vide quand la semaine n’a rien vu", () => {
    expect(weekActions([])).toEqual([]);
  });
});

describe("dayLabel", () => {
  const now = at("2026-09-09T10:00:00Z"); // mercredi 12 h Paris

  it("nomme le jour en heure de Paris", () => {
    expect(dayLabel(at("2026-09-09T05:00:00Z"), now)).toBe("aujourd’hui");
    expect(dayLabel(at("2026-09-08T20:00:00Z"), now)).toBe("hier");
    expect(dayLabel(at("2026-09-07T09:00:00Z"), now)).toBe("lundi");
    expect(dayLabel(at("2026-09-06T19:30:00Z"), now)).toBe("dimanche"); // 21 h 30 Paris : ouverture de la semaine
  });

  it("compte les jours à Paris, pas en UTC", () => {
    // 23 h 30 UTC le mardi = 01 h 30 le mercredi à Paris : c’est « aujourd’hui ».
    expect(dayLabel(at("2026-09-08T23:30:00Z"), now)).toBe("aujourd’hui");
    // 22 h 30 UTC le lundi = 00 h 30 le mardi à Paris : c’est « hier ».
    expect(dayLabel(at("2026-09-07T22:30:00Z"), now)).toBe("hier");
  });
});
