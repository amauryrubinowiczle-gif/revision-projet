import type { Card } from "@domain/entities/Card";
import type { Exercise } from "@domain/entities/Exercise";
import type { ReviewSessionId } from "@domain/value-objects/Ids";

export interface ReviewSessionPlanCard {
  card: Card;
  /** Exercices référencés par la carte, déjà résolus (voir domain/policies/selectExercise.ts). */
  availableExercises: Exercise[];
}

export interface ReviewSessionPlan {
  sessionId: ReviewSessionId;
  cards: ReviewSessionPlanCard[];
}
