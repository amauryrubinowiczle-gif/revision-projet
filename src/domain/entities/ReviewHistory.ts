import type {
  CardId,
  CardReviewEventId,
  DefinitionId,
  DefinitionReviewResultId,
  ExerciseId,
  QuestionId,
  QuestionReviewResultId,
  ReviewSessionId,
} from "../value-objects/Ids";
import type { ReviewOutcome } from "../value-objects/ReviewOutcome";
import type { ReviewLevel } from "../value-objects/ReviewLevel";

/**
 * QuestionReviewResult / DefinitionReviewResult — granularité fine (par question, par
 * définition), auto-évaluée par l'utilisateur au moment de chaque item. Nécessaire pour :
 * (1) le résumé factuel affiché avant le verdict global, (2) la détection de "fiches en
 * difficulté" dans les statistiques, (3) la future fonctionnalité IA de détection des
 * notions mal maîtrisées.
 */
export interface QuestionReviewResult {
  id: QuestionReviewResultId;
  cardReviewEventId: CardReviewEventId;
  questionId: QuestionId;
  result: ReviewOutcome;
  revisionSheetShown: boolean;
  timeSpentSeconds: number | null;
}

export interface DefinitionReviewResult {
  id: DefinitionReviewResultId;
  cardReviewEventId: CardReviewEventId;
  definitionId: DefinitionId;
  result: ReviewOutcome;
}

/**
 * CardReviewEvent — une ligne par carte par session. `result` est le VERDICT GLOBAL
 * décidé explicitement par l'utilisateur (voir domain/policies/summarizeCardResults.ts),
 * pas un calcul automatique à partir des résultats question par question.
 *
 * C'est la source de vérité unique de l'historique : `successHistory` et `reviewHistory`
 * cités dans le brief comme des champs de Card sont des VUES CALCULÉES à partir de cette
 * table (+ ses tables filles), jamais des colonnes dupliquées (voir section 8).
 */
export interface CardReviewEvent {
  id: CardReviewEventId;
  sessionId: ReviewSessionId;
  cardId: CardId;
  reviewedAt: Date;
  result: ReviewOutcome;
  levelBefore: ReviewLevel;
  levelAfter: ReviewLevel;
  exerciseProposedId: ExerciseId | null;
  timeSpentSeconds: number | null;
  /** false tant que finalizeCardReview() n'a pas été appelé — distingue une carte terminée d'une carte abandonnée en session. */
  completed: boolean;
}
