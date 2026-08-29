import type { ReviewHistoryRepository } from "@domain/ports/ReviewHistoryRepository";
import type { CardReviewEventId, DefinitionId } from "@domain/value-objects/Ids";
import type { ReviewOutcome } from "@domain/value-objects/ReviewOutcome";

export class SubmitDefinitionResultUseCase {
  constructor(private readonly reviewHistoryRepository: ReviewHistoryRepository) {}

  async execute(input: { cardReviewEventId: CardReviewEventId; definitionId: DefinitionId; result: ReviewOutcome }): Promise<void> {
    await this.reviewHistoryRepository.recordDefinitionResult(input);
  }
}
