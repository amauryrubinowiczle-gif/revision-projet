import { describe, expect, it } from "vitest";
import { computeNextReview } from "@domain/policies/computeNextReview";
import { LocalDate } from "@domain/value-objects/LocalDate";
import type { ReviewLevel } from "@domain/value-objects/ReviewLevel";

const TODAY = LocalDate.fromISODate("2026-08-28");

describe("computeNextReview — moteur de répétition espacée (paliers fixes 1..7)", () => {
  it.each([1, 2, 3, 4, 5, 6, 7] as ReviewLevel[])(
    "en cas d'ÉCHEC au niveau %i, retombe TOUJOURS au niveau 1 avec révision dès demain",
    (level) => {
      const result = computeNextReview(level, "FAILURE", TODAY);
      expect(result.level).toBe(1);
      expect(result.nextReviewDate.toISODate()).toBe("2026-08-29");
    },
  );

  it.each([
    [1, 2, "2026-08-30"],
    [2, 3, "2026-08-31"],
    [3, 4, "2026-09-01"],
    [4, 5, "2026-09-02"],
    [5, 6, "2026-09-03"],
    [6, 7, "2026-09-04"],
  ] as const)("en cas de RÉUSSITE au niveau %i, progresse au niveau %i (+%s jours)", (level, expectedLevel, expectedDate) => {
    const result = computeNextReview(level, "SUCCESS", TODAY);
    expect(result.level).toBe(expectedLevel);
    expect(result.nextReviewDate.toISODate()).toBe(expectedDate);
  });

  it("au niveau maximum (7), une réussite supplémentaire NE dépasse PAS le palier 7", () => {
    const result = computeNextReview(7, "SUCCESS", TODAY);
    expect(result.level).toBe(7);
    expect(result.nextReviewDate.toISODate()).toBe("2026-09-04"); // +7 jours
  });

  it("est une fonction pure : deux appels identiques donnent un résultat identique, sans effet de bord", () => {
    const a = computeNextReview(3, "SUCCESS", TODAY);
    const b = computeNextReview(3, "SUCCESS", TODAY);
    expect(a).toEqual(b);
  });
});
