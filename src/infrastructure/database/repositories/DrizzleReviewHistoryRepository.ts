import { eq } from "drizzle-orm";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type {
  FinalizeCardReviewInput,
  RecordDefinitionResultInput,
  RecordQuestionResultInput,
  ReviewHistoryRepository,
} from "@domain/ports/ReviewHistoryRepository";
import { asCardReviewEventId, asReviewSessionId, type CardId, type CardReviewEventId, type ReviewSessionId } from "@domain/value-objects/Ids";
import type { ReviewLevel } from "@domain/value-objects/ReviewLevel";
import * as schema from "../schema";
import { generateId } from "../ids";

/** Adaptateur concret du port ReviewHistoryRepository (voir domain/ports/ReviewHistoryRepository.ts). */
export class DrizzleReviewHistoryRepository implements ReviewHistoryRepository {
  constructor(private readonly db: SqliteRemoteDatabase<typeof schema>) {}

  async createSession(input: { startedAt: Date; cardsPlanned: number }): Promise<ReviewSessionId> {
    const id = generateId();
    await this.db.insert(schema.reviewSessions).values({
      id,
      startedAt: input.startedAt.toISOString(),
      endedAt: null,
      cardsPlanned: input.cardsPlanned,
      cardsCompleted: 0,
    });
    return asReviewSessionId(id);
  }

  async createCardReviewEvent(input: { sessionId: ReviewSessionId; cardId: CardId; levelBefore: ReviewLevel }): Promise<CardReviewEventId> {
    // Créé au DÉBUT du traitement de la carte (persistance incrémentale, voir section 8) :
    // levelAfter/result sont provisoires et corrigés par finalizeCardReview() une fois le
    // verdict de l'utilisateur connu — ainsi un résultat de question est déjà en base
    // même si la session est interrompue avant la fin de la carte.
    const id = generateId();
    await this.db.insert(schema.cardReviewEvents).values({
      id,
      sessionId: input.sessionId,
      cardId: input.cardId,
      reviewedAt: new Date().toISOString(),
      result: "FAILURE",
      levelBefore: input.levelBefore,
      levelAfter: input.levelBefore,
      exerciseProposedId: null,
      timeSpentSeconds: null,
      completed: false,
    });
    return asCardReviewEventId(id);
  }

  async recordQuestionResult(input: RecordQuestionResultInput): Promise<void> {
    await this.db.insert(schema.questionReviewResults).values({
      id: generateId(),
      cardReviewEventId: input.cardReviewEventId,
      questionId: input.questionId,
      result: input.result,
      revisionSheetShown: input.revisionSheetShown,
      timeSpentSeconds: input.timeSpentSeconds,
    });
  }

  async recordDefinitionResult(input: RecordDefinitionResultInput): Promise<void> {
    await this.db.insert(schema.definitionReviewResults).values({
      id: generateId(),
      cardReviewEventId: input.cardReviewEventId,
      definitionId: input.definitionId,
      result: input.result,
    });
  }

  async finalizeCardReview(input: FinalizeCardReviewInput): Promise<void> {
    await this.db
      .update(schema.cardReviewEvents)
      .set({
        result: input.result,
        levelBefore: input.levelBefore,
        levelAfter: input.levelAfter,
        exerciseProposedId: input.exerciseProposedId,
        timeSpentSeconds: input.timeSpentSeconds,
        completed: true,
      })
      .where(eq(schema.cardReviewEvents.id, input.cardReviewEventId));
  }

  async endSession(sessionId: ReviewSessionId, cardsCompleted: number): Promise<void> {
    await this.db
      .update(schema.reviewSessions)
      .set({ endedAt: new Date().toISOString(), cardsCompleted })
      .where(eq(schema.reviewSessions.id, sessionId));
  }
}
