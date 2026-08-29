import type { ReviewHistoryRepository } from "@domain/ports/ReviewHistoryRepository";
import type { CardId, CardReviewEventId, ReviewSessionId } from "@domain/value-objects/Ids";
import type { ReviewLevel } from "@domain/value-objects/ReviewLevel";

/**
 * Ouvre le CardReviewEvent d'UNE carte au sein de la session — appelé quand l'UI commence
 * à traiter cette carte (avant la première question). Permet la persistance incrémentale :
 * chaque résultat de question/définition est enregistré immédiatement contre cet id,
 * sans attendre la fin de la carte (voir section 8, résistance à un crash en session).
 */
export class StartCardReviewUseCase {
  constructor(private readonly reviewHistoryRepository: ReviewHistoryRepository) {}

  async execute(input: { sessionId: ReviewSessionId; cardId: CardId; currentLevel: ReviewLevel }): Promise<CardReviewEventId> {
    return this.reviewHistoryRepository.createCardReviewEvent({
      sessionId: input.sessionId,
      cardId: input.cardId,
      levelBefore: input.currentLevel,
    });
  }
}
