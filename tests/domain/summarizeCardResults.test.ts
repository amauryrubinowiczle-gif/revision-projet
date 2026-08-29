import { describe, expect, it } from "vitest";
import { summarizeCardResults } from "@domain/policies/summarizeCardResults";

describe("summarizeCardResults — résumé factuel, PAS une décision", () => {
  it("compte correctement les réussites/échecs des questions et définitions séparément", () => {
    const summary = summarizeCardResults(["SUCCESS", "SUCCESS", "FAILURE"], ["SUCCESS", "FAILURE"]);
    expect(summary).toEqual({
      questionsSucceeded: 2,
      questionsTotal: 3,
      definitionsSucceeded: 1,
      definitionsTotal: 2,
    });
  });

  it("gère une carte sans définitions", () => {
    const summary = summarizeCardResults(["SUCCESS"], []);
    expect(summary.definitionsTotal).toBe(0);
    expect(summary.definitionsSucceeded).toBe(0);
  });

  it("ne produit aucun verdict SUCCESS/FAILURE — uniquement des compteurs", () => {
    const summary = summarizeCardResults(["FAILURE", "FAILURE"], []);
    expect(summary).not.toHaveProperty("result");
    expect(summary).not.toHaveProperty("outcome");
  });
});
