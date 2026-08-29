import { describe, expect, it } from "vitest";
import { UpdateCardUseCase } from "@application/card/UpdateCardUseCase";
import { UnarchiveCardUseCase } from "@application/card/UnarchiveCardUseCase";
import { DomainValidationError } from "@domain/errors/DomainValidationError";
import { asCardId, asCourseId, asExerciseId, asTagId } from "@domain/value-objects/Ids";
import { FakeCardRepository, makeTestCard } from "./fakes";

describe("UpdateCardUseCase", () => {
  it("réécrit titre, cours, niveau, questions, définitions, exercices et tags", async () => {
    const cardRepository = new FakeCardRepository();
    const cardId = asCardId("card-1");
    cardRepository.seed(makeTestCard({ id: cardId, title: "Ancien titre", currentLevel: 1 }));

    await new UpdateCardUseCase(cardRepository).execute(cardId, {
      title: "Nouveau titre",
      courseId: asCourseId("course-1"),
      notes: "note",
      currentLevel: 4,
      questions: [
        { prompt: "Q1 ?", answerText: "R1", revisionSheetContent: "Fiche Q1" },
        { prompt: "Q2 ?", answerText: "R2", revisionSheetContent: null },
      ],
      definitions: [{ term: "Terme", expectedAnswer: "Def", linkedQuestionIndex: 0 }],
      exerciseIds: [asExerciseId("ex-1")],
      tagIds: [asTagId("tag-1")],
    });

    const updated = await cardRepository.findById(cardId);
    expect(updated?.title).toBe("Nouveau titre");
    expect(updated?.currentLevel).toBe(4);
    expect(updated?.questions).toHaveLength(2);
    expect(updated?.questions[0]?.revisionSheet?.content).toBe("Fiche Q1");
    expect(updated?.definitions[0]?.linkedQuestionId).toBe(updated?.questions[0]?.id);
    expect(updated?.exerciseRefs.map((r) => r.exerciseId)).toEqual([asExerciseId("ex-1")]);
    expect(updated?.tagIds).toEqual([asTagId("tag-1")]);
  });

  it("ne modifie pas nextReviewDate quand on édite juste le niveau", async () => {
    const cardRepository = new FakeCardRepository();
    const cardId = asCardId("card-1");
    const card = makeTestCard({ id: cardId, currentLevel: 1 });
    cardRepository.seed(card);

    await new UpdateCardUseCase(cardRepository).execute(cardId, {
      title: card.title,
      courseId: card.courseId,
      notes: card.notes,
      currentLevel: 6,
      questions: [{ prompt: "Q ?", answerText: "R", revisionSheetContent: null }],
      definitions: [],
      exerciseIds: [],
      tagIds: [],
    });

    const updated = await cardRepository.findById(cardId);
    expect(updated?.currentLevel).toBe(6);
    expect(updated?.nextReviewDate.equals(card.nextReviewDate)).toBe(true);
  });

  it("rejette une fiche sans question, comme à la création", async () => {
    const cardRepository = new FakeCardRepository();
    const cardId = asCardId("card-1");
    cardRepository.seed(makeTestCard({ id: cardId }));

    await expect(
      new UpdateCardUseCase(cardRepository).execute(cardId, {
        title: "Titre",
        courseId: null,
        notes: null,
        currentLevel: 1,
        questions: [],
        definitions: [],
        exerciseIds: [],
        tagIds: [],
      }),
    ).rejects.toThrow(DomainValidationError);
  });
});

describe("UnarchiveCardUseCase", () => {
  it("remet une fiche archivée en activité", async () => {
    const cardRepository = new FakeCardRepository();
    const cardId = asCardId("card-1");
    cardRepository.seed(makeTestCard({ id: cardId, isArchived: true }));

    await new UnarchiveCardUseCase(cardRepository).execute(cardId);

    const card = await cardRepository.findById(cardId);
    expect(card?.isArchived).toBe(false);
  });
});
