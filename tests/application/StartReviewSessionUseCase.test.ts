import { describe, expect, it } from "vitest";
import { StartReviewSessionUseCase } from "@application/review/StartReviewSessionUseCase";
import { LocalDate } from "@domain/value-objects/LocalDate";
import { asCardId, asExerciseId } from "@domain/value-objects/Ids";
import { FakeCardRepository, FakeClock, FakeExerciseRepository, FakeReviewHistoryRepository, makeTestCard } from "./fakes";

const TODAY = LocalDate.fromISODate("2026-08-28");

describe("StartReviewSessionUseCase", () => {
  it("ne retient que les fiches dues aujourd'hui (dues ou en retard), jamais les fiches futures ou archivées", async () => {
    const cardRepository = new FakeCardRepository();
    const dueToday = makeTestCard({ id: asCardId("due-today"), nextReviewDate: TODAY });
    const overdue = makeTestCard({ id: asCardId("overdue"), nextReviewDate: TODAY.plusDays(-3) });
    const future = makeTestCard({ id: asCardId("future"), nextReviewDate: TODAY.plusDays(2) });
    const archived = makeTestCard({ id: asCardId("archived"), nextReviewDate: TODAY, isArchived: true });
    [dueToday, overdue, future, archived].forEach((c) => cardRepository.seed(c));

    const useCase = new StartReviewSessionUseCase(
      cardRepository,
      new FakeReviewHistoryRepository(),
      new FakeExerciseRepository(),
      new FakeClock(TODAY),
    );

    const plan = await useCase.execute();

    const ids = plan.cards.map((c) => c.card.id).sort();
    expect(ids).toEqual(["due-today", "overdue"]);
  });

  it("résout les exercices disponibles pour chaque carte à partir de ses références", async () => {
    const cardRepository = new FakeCardRepository();
    const exerciseRepository = new FakeExerciseRepository();
    const exercise = {
      id: asExerciseId("ex-1"),
      title: "Calcul de dérivées",
      description: null,
      reference: "manuel p.42",
      difficulty: "MEDIUM" as const,
      courseId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    exerciseRepository.seed(exercise);
    const card = makeTestCard({ nextReviewDate: TODAY, exerciseRefs: [{ exerciseId: exercise.id, order: 0 }] });
    cardRepository.seed(card);

    const useCase = new StartReviewSessionUseCase(cardRepository, new FakeReviewHistoryRepository(), exerciseRepository, new FakeClock(TODAY));
    const plan = await useCase.execute();

    expect(plan.cards[0]?.availableExercises).toEqual([exercise]);
  });
});
