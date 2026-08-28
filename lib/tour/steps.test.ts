import { describe, expect, it } from "vitest";
import { STEP_PARAM, TOUR_PARAM, TOURS, type TourId, clampStep, isTourId, resolvePath, tourHref } from "./steps";

/** Routes the app really serves (player + admin), used to catch a typo in a step path. */
const KNOWN_PATHS = ["/home", "/books", "/bingo", "/quests", "/story", "/leaderboard", "/team", "/help", "/admin", "/admin/challenge", "/admin/teams", "/admin/players"];

const ids = Object.keys(TOURS) as TourId[];

describe("visites guidées de Kyle", () => {
  it("propose une visite joueur et une visite organisateur", () => {
    expect(ids).toEqual(["player", "admin"]);
    expect(TOURS.player).toHaveLength(9);
    expect(TOURS.admin).toHaveLength(5);
    expect(isTourId("player")).toBe(true);
    expect(isTourId("nope")).toBe(false);
  });

  it("donne à chaque étape un id unique, un chemin connu et un texte", () => {
    for (const tour of ids) {
      const seen = new Set<string>();
      for (const step of TOURS[tour]) {
        expect(seen.has(step.id), `${tour}/${step.id} en double`).toBe(false);
        seen.add(step.id);
        expect(KNOWN_PATHS, `${tour}/${step.id}`).toContain(step.path);
        expect(step.title.length, `${tour}/${step.id}`).toBeGreaterThan(0);
        expect(step.body.length, `${tour}/${step.id}`).toBeGreaterThan(20);
      }
    }
  });

  it("laisse chaque étape cibler un élément de la page", () => {
    for (const tour of ids) for (const step of TOURS[tour]) expect(step.target, `${tour}/${step.id}`).toBeTruthy();
  });

  it("projette les chemins sur la démo", () => {
    expect(resolvePath("/home", "")).toBe("/home");
    expect(resolvePath("/home", "/demo")).toBe("/demo");
    expect(resolvePath("/books", "/demo")).toBe("/demo/books");
    expect(resolvePath("/admin/teams", "/demo")).toBe("/demo/admin/teams");
  });

  it("borne l'étape même si l'URL est trafiquée", () => {
    expect(clampStep("player", -3)).toBe(0);
    expect(clampStep("player", 99)).toBe(8);
    expect(clampStep("player", 2.7)).toBe(2);
    expect(clampStep("player", Number.NaN)).toBe(0);
    expect(clampStep("admin", 4)).toBe(4);
  });

  it("construit l'URL d'une étape", () => {
    expect(tourHref("player", 0, "")).toBe(`/home?${TOUR_PARAM}=player&${STEP_PARAM}=0`);
    expect(tourHref("player", 2, "/demo")).toBe(`/demo/books?${TOUR_PARAM}=player&${STEP_PARAM}=2`);
    expect(tourHref("admin", 99, "/demo")).toBe(`/demo/admin/players?${TOUR_PARAM}=admin&${STEP_PARAM}=4`);
  });
});
