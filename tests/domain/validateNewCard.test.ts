import { describe, expect, it } from "vitest";
import { validateNewCard } from "@domain/policies/validateNewCard";
import { DomainValidationError } from "@domain/errors/DomainValidationError";
import type { NewCardAggregate } from "@domain/entities/NewCardAggregate";

function baseInput(overrides: Partial<NewCardAggregate> = {}): NewCardAggregate {
  return {
    title: "Dérivées usuelles",
    courseId: null,
    notes: null,
    questions: [{ prompt: "Dérivée de x²  ?", answerText: "2x", revisionSheetContent: null }],
    definitions: [],
    exerciseIds: [],
    tagIds: [],
    ...overrides,
  };
}

describe("validateNewCard", () => {
  it("accepte une fiche valide", () => {
    expect(() => validateNewCard(baseInput())).not.toThrow();
  });

  it("rejette un titre vide", () => {
    expect(() => validateNewCard(baseInput({ title: "   " }))).toThrow(DomainValidationError);
  });

  it("rejette une fiche sans aucune question", () => {
    expect(() => validateNewCard(baseInput({ questions: [] }))).toThrow(DomainValidationError);
  });

  it("rejette une question sans réponse", () => {
    expect(() =>
      validateNewCard(baseInput({ questions: [{ prompt: "Question ?", answerText: "  ", revisionSheetContent: null }] })),
    ).toThrow(DomainValidationError);
  });
});
