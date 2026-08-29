import type { ReviewHistoryRepository } from "@domain/ports/ReviewHistoryRepository";
import type { ReviewSessionId } from "@domain/value-objects/Ids";

export class EndReviewSessionUseCase {
  constructor(private readonly reviewHistoryRepository: ReviewHistoryRepository) {}

  async execute(sessionId: ReviewSessionId, cardsCompleted: number): Promise<void> {
    await this.reviewHistoryRepository.endSession(sessionId, cardsCompleted);
  }
}
