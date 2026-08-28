import { describe, expect, it } from "vitest";
import { effectiveType, readingPoints, round1 } from "@/lib/scoring/reading";
import {
  DEMO_BOARD_CELLS,
  DEMO_BOOKS,
  DEMO_BY_SOURCE,
  DEMO_DECLARED_GRAPHIC,
  DEMO_HOME,
  DEMO_LEADERBOARD,
  DEMO_LEDGER,
  DEMO_MEMBERS,
  DEMO_MY_BOOKS,
  DEMO_READINGS_ADMIN,
  DEMO_TEAM,
} from "./data";

const sum = (xs: number[]) => round1(xs.reduce((n, x) => n + x, 0));

describe("données de démo", () => {
  it("respecte le barème : points = pages ÷ 10, moitié sous 150 pages", () => {
    for (const b of DEMO_BOOKS) {
      expect(b.points, b.title).toBe(readingPoints(b.pages));
      expect(b.type, b.title).toBe(effectiveType(b.pages, DEMO_DECLARED_GRAPHIC[b.id]));
    }
  });

  it("applique le même barème aux lectures de la supervision admin", () => {
    expect(DEMO_READINGS_ADMIN.some((b) => b.deleted)).toBe(true);
    for (const b of DEMO_READINGS_ADMIN) {
      expect(b.points, b.title).toBe(readingPoints(b.pages));
      expect(b.type, b.title).toBe(effectiveType(b.pages, b.declaredGraphic));
      expect(b.questHalf, b.title).toBe(b.type === "GRAPHIQUE");
      expect(b.cellHalf, b.title).toBe(b.cellLabel !== null && b.type === "GRAPHIQUE");
    }
  });

  it("fait correspondre le score de l'équipe, le livre de comptes et les totaux par source", () => {
    const ledger = sum(DEMO_LEDGER.map((e) => e.amount));
    expect(ledger).toBe(DEMO_TEAM.points);
    expect(sum(Object.values(DEMO_BY_SOURCE))).toBe(DEMO_TEAM.points);
    expect(sum(DEMO_MEMBERS.map((m) => m.points))).toBe(DEMO_TEAM.points);
  });

  it("aligne le livre de comptes sur les lectures déclarées", () => {
    const reading = sum(DEMO_LEDGER.filter((e) => e.source === "READING").map((e) => e.amount));
    expect(reading).toBe(sum(DEMO_BOOKS.map((b) => b.points)));
    expect(reading).toBe(DEMO_BY_SOURCE.READING);
  });

  it("place l'équipe de démo au rang annoncé sur l'accueil", () => {
    const rows = [...DEMO_LEADERBOARD].sort((a, b) => b.points - a.points);
    const me = rows.findIndex((r) => r.teamId === DEMO_TEAM.id);
    expect(DEMO_HOME.rank?.position).toBe(rows[me].rank);
    expect(DEMO_HOME.rank?.total).toBe(rows.length);
    expect(DEMO_HOME.rank?.gapPoints).toBe(round1(rows[me - 1].points - rows[me].points));
    expect(DEMO_HOME.rank?.ahead).toBe(rows[me - 1].name);
    expect(DEMO_HOME.score).toBe(rows[me].points);
  });

  it("garde l'accueil cohérent avec les lectures du joueur de démo", () => {
    expect(DEMO_HOME.stats.romans).toBe(DEMO_MY_BOOKS.filter((b) => b.type === "ROMAN").length);
    expect(DEMO_HOME.stats.graphiques).toBe(DEMO_MY_BOOKS.filter((b) => b.type === "GRAPHIQUE").length);
    expect(round1(DEMO_HOME.stats.myPoints)).toBe(sum(DEMO_MY_BOOKS.map((b) => b.points)));
  });

  it("décrit une grille de bingo valide : une seule ligne complète et des ½ en attente", () => {
    expect(DEMO_BOARD_CELLS).toHaveLength(25);
    const done = DEMO_BOARD_CELLS.filter((c) => c.complete);
    expect(done).toHaveLength(9);
    // First row complete → exactly one line.
    expect(DEMO_BOARD_CELLS.slice(0, 5).every((c) => c.complete)).toBe(true);
    for (const c of DEMO_BOARD_CELLS) {
      const weight = c.books.reduce((n, b) => n + (b.type === "ROMAN" ? 1 : 0.5), 0);
      expect(c.weight, c.label).toBe(Math.min(weight, 1));
      expect(c.complete, c.label).toBe(weight >= 1);
    }
  });
});
