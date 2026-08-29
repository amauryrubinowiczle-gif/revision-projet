import { describe, expect, it } from "vitest";
import { CompleteCardReviewUseCase } from "@application/review/CompleteCardReviewUseCase";
import { asCardReviewEventId } from "@domain/value-objects/Ids";
import { LocalDate } from "@domain/value-objects/LocalDate";
import { FakeCardRepository, FakeClock, FakeReviewHistoryRepository, makeTestCard } from "./fakes";

describe("CompleteCardReviewUseCase", () => {
  it("applique computeNextReview et persiste la nouvelle planification de la carte", async () => {
    const cardRepository = new FakeCardRepository();
    const reviewHistoryRepository = new FakeReviewHistoryRepository();
    const clock = new FakeClock(LocalDate.fromISODate("2026-08-28"));
    const card = makeTestCard({ currentLevel: 2 });
    cardRepository.seed(card);

    const useCase = new CompleteCardReviewUseCase(cardRepository, reviewHistoryRepository, clock);

    const updated = await useCase.execute({
      card,
      cardReviewEventId: asCardReviewEventId("event-1"),
      userOutcome: "SUCCESS",
      exerciseProposedId: null,
      timeSpentSeconds: 42,
    });

    expect(updated.currentLevel).toBe(3);
    expect(updated.nextReviewDate.toISODate()).toBe("2026-08-31"); // +3 jours
    expect(updated.lastReviewDate?.toISODate()).toBe("2026-08-28");

    const persisted = await cardRepository.findById(card.id);
    expect(persisted?.currentLevel).toBe(3);

    expect(reviewHistoryRepository.finalizedEvents).toHaveLength(1);
    expect(reviewHistoryRepository.finalizedEvents[0]).toMatchObject({
      result: "SUCCESS",
      levelBefore: 2,
      levelAfter: 3,
      timeSpentSeconds: 42,
    });
  });

  it("un échec ramène la carte au niveau 1 avec révision dès demain, quel que soit le niveau de départ", async () => {
    const cardRepository = new FakeCardRepository();
    const reviewHistoryRepository = new FakeReviewHistoryRepository();
    const clock = new FakeClock(LocalDate.fromISODate("2026-08-28"));
    const card = makeTestCard({ currentLevel: 6 });
    cardRepository.seed(card);

    const useCase = new CompleteCardReviewUseCase(cardRepository, reviewHistoryRepository, clock);
    const updated = await useCase.execute({
      card,
      cardReviewEventId: asCardReviewEventId("event-1"),
      userOutcome: "FAILURE",
      exerciseProposedId: null,
      timeSpentSeconds: null,
    });

    expect(updated.currentLevel).toBe(1);
    expect(updated.nextReviewDate.toISODate()).toBe("2026-08-29");
  });
});
