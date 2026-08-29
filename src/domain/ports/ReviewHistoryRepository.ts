import type { CardId, CardReviewEventId, DefinitionId, ExerciseId, QuestionId, ReviewSessionId } from "../value-objects/Ids";
import type { ReviewOutcome } from "../value-objects/ReviewOutcome";
import type { ReviewLevel } from "../value-objects/ReviewLevel";

export interface RecordQuestionResultInput {
  cardReviewEventId: CardReviewEventId;
  questionId: QuestionId;
  result: ReviewOutcome;
  revisionSheetShown: boolean;
  timeSpentSeconds: number | null;
}

export interface RecordDefinitionResultInput {
  cardReviewEventId: CardReviewEventId;
  definitionId: DefinitionId;
  result: ReviewOutcome;
}

export interface FinalizeCardReviewInput {
  cardReviewEventId: CardReviewEventId;
  result: ReviewOutcome; // verdict décidé par l'utilisateur
  levelBefore: ReviewLevel;
  levelAfter: ReviewLevel;
  exerciseProposedId: ExerciseId | null;
  timeSpentSeconds: number | null;
}

/**
 * Port de l'historique de révision. `createCardReviewEvent` est appelé au DÉBUT du
 * traitement d'une carte (pas à la fin) pour permettre la persistance incrémentale des
 * résultats question par question — voir flux 5.3, point d'amélioration en section 8
 * (résistance à un crash en cours de session).
 */
export interface ReviewHistoryRepository {
  createSession(input: { startedAt: Date; cardsPlanned: number }): Promise<ReviewSessionId>;
  createCardReviewEvent(input: { sessionId: ReviewSessionId; cardId: CardId; levelBefore: ReviewLevel }): Promise<CardReviewEventId>;
  recordQuestionResult(input: RecordQuestionResultInput): Promise<void>;
  recordDefinitionResult(input: RecordDefinitionResultInput): Promise<void>;
  finalizeCardReview(input: FinalizeCardReviewInput): Promise<void>;
  endSession(sessionId: ReviewSessionId, cardsCompleted: number): Promise<void>;
}
