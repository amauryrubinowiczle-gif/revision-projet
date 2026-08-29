import type { CardId, CourseId, ExerciseId, TagId } from "../value-objects/Ids";
import type { ReviewLevel } from "../value-objects/ReviewLevel";
import { LocalDate } from "../value-objects/LocalDate";
import { computeDueStatus, type DueStatus } from "../value-objects/DueStatus";
import type { Question } from "./Question";
import type { Definition } from "./Definition";
import type { Comment } from "./Comment";

export interface CardExerciseRef {
  exerciseId: ExerciseId;
  order: number;
}

/**
 * Card — l'agrégat racine. Contient plusieurs Questions (chacune avec sa propre
 * RevisionSheet), des Definitions, des références vers des Exercises (pas les
 * exercices eux-mêmes), des Tags, des Comments.
 *
 * currentLevel / nextReviewDate sont volontairement dénormalisés sur l'agrégat
 * (plutôt que recalculés depuis l'historique) : ce sont des champs de PLANIFICATION
 * lus à chaque calcul des "fiches dues aujourd'hui", qui doit rester rapide même
 * avec plusieurs centaines de fiches.
 */
export interface Card {
  id: CardId;
  title: string;
  courseId: CourseId | null;
  currentLevel: ReviewLevel;
  nextReviewDate: LocalDate;
  lastReviewDate: LocalDate | null;
  isArchived: boolean;
  notes: string | null;
  questions: Question[];
  definitions: Definition[];
  exerciseRefs: CardExerciseRef[];
  tagIds: TagId[];
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

/** Statut d'affichage calculé — jamais stocké (voir section 8 du document d'architecture). */
export function getCardDueStatus(card: Pick<Card, "isArchived" | "nextReviewDate">, today: LocalDate): DueStatus {
  return computeDueStatus({ isArchived: card.isArchived, nextReviewDate: card.nextReviewDate, today });
}
