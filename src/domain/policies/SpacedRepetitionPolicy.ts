import type { LocalDate } from "../value-objects/LocalDate";
import type { ReviewLevel } from "../value-objects/ReviewLevel";
import type { ReviewOutcome } from "../value-objects/ReviewOutcome";

export interface NextReview {
  level: ReviewLevel;
  nextReviewDate: LocalDate;
}

/**
 * Strategy Pattern (amélioration proposée en section 8 du document d'architecture) :
 * le client demande explicitement des paliers fixes 1..7 jours — c'est le comportement
 * PAR DÉFAUT et implémenté ci-contre par FixedStepSpacedRepetitionPolicy. Cette interface
 * permet d'ajouter plus tard une politique alternative (ex. SM-2), par carte ou par cours,
 * sans toucher au reste de l'architecture (use cases, UI, DB) : seule l'implémentation
 * injectée change.
 */
export interface SpacedRepetitionPolicy {
  computeNext(currentLevel: ReviewLevel, outcome: ReviewOutcome, today: LocalDate): NextReview;
}
