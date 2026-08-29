import { describe, expect, it } from "vitest";
import { NotImplementedAIService } from "@infrastructure/services/ai/NotImplementedAIService";

// Ce test vit dans tests/domain (et non tests/infrastructure) car il vérifie un CONTRAT
// du domaine (AIService) plutôt qu'un détail d'implémentation SQL — il n'y a rien d'autre
// à tester tant qu'aucun vrai fournisseur n'est branché.
describe("NotImplementedAIService — stub du port AIService", () => {
  const service = new NotImplementedAIService();

  it("generateCards lève Not implemented", async () => {
    await expect(service.generateCards({ kind: "markdown", content: "" })).rejects.toThrow("Not implemented");
  });

  it("verifyAnswer lève Not implemented", async () => {
    // @ts-expect-error - question factice, seul le rejet nous intéresse ici
    await expect(service.verifyAnswer({}, "réponse")).rejects.toThrow("Not implemented");
  });

  it("generateRevisionSheet lève Not implemented", async () => {
    // @ts-expect-error - question factice
    await expect(service.generateRevisionSheet({})).rejects.toThrow("Not implemented");
  });

  it("generateExercises lève Not implemented", async () => {
    // @ts-expect-error - carte factice
    await expect(service.generateExercises({})).rejects.toThrow("Not implemented");
  });

  it("summarizeCourse lève Not implemented", async () => {
    // @ts-expect-error - cours factice
    await expect(service.summarizeCourse({})).rejects.toThrow("Not implemented");
  });
});
