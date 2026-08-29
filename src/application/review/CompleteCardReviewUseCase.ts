import type { CardRepository } from "@domain/ports/CardRepository";
import type { ReviewHistoryRepository } from "@domain/ports/ReviewHistoryRepository";
import type { Card } from "@domain/entities/Card";
import type { Clock } from "@domain/ports/Clock";
import { computeNextReview } from "@domain/policies/computeNextReview";
import type { CardReviewEventId, ExerciseId } from "@domain/value-objects/Ids";
import type { ReviewOutcome } from "@domain/value-objects/ReviewOutcome";

/**
 * Point 9-10 du flux "Réviser aujourd'hui" (section 5.3) : reçoit le VERDICT DÉJÀ DÉCIDÉ
 * par l'utilisateur (après affichage du résumé factuel de domain/policies/summarizeCardResults.ts
 * — ce use case ne recalcule aucune agrégation), applique le moteur de répétition espacée,
 * et persiste à la fois la nouvelle planification de la carte et l'événement d'historique finalisé.
 */
export class CompleteCardReviewUseCase {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly reviewHistoryRepository: ReviewHistoryRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    card: Card;
    cardReviewEventId: CardReviewEventId;
    userOutcome: ReviewOutcome;
    exerciseProposedId: ExerciseId | null;
    timeSpentSeconds: number | null;
  }): Promise<Card> {
    const today = this.clock.today();
    const { level, nextReviewDate } = computeNextReview(input.card.currentLevel, input.userOutcome, today);

    const updatedCard: Card = {
      ...input.card,
      currentLevel: level,
      nextReviewDate,
      lastReviewDate: today,
    };

    await this.cardRepository.save(updatedCard);

    await this.reviewHistoryRepository.finalizeCardReview({
      cardReviewEventId: input.cardReviewEventId,
      result: input.userOutcome,
      levelBefore: input.card.currentLevel,
      levelAfter: level,
      exerciseProposedId: input.exerciseProposedId,
      timeSpentSeconds: input.timeSpentSeconds,
    });

    return updatedCard;
  }
}
