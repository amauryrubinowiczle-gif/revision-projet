import type { ReviewHistoryRepository } from "@domain/ports/ReviewHistoryRepository";
import type { CardReviewEventId, QuestionId } from "@domain/value-objects/Ids";
import type { ReviewOutcome } from "@domain/value-objects/ReviewOutcome";

export class SubmitQuestionResultUseCase {
  constructor(private readonly reviewHistoryRepository: ReviewHistoryRepository) {}

  async execute(input: {
    cardReviewEventId: CardReviewEventId;
    questionId: QuestionId;
    result: ReviewOutcome;
    revisionSheetShown: boolean;
    timeSpentSeconds: number | null;
  }): Promise<void> {
    await this.reviewHistoryRepository.recordQuestionResult(input);
  }
}
