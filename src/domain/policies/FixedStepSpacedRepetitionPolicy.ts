import type { LocalDate } from "../value-objects/LocalDate";
import type { ReviewLevel } from "../value-objects/ReviewLevel";
import type { ReviewOutcome } from "../value-objects/ReviewOutcome";
import { computeNextReview } from "./computeNextReview";
import type { NextReview, SpacedRepetitionPolicy } from "./SpacedRepetitionPolicy";

/** Implémentation par défaut (et actuellement unique) de SpacedRepetitionPolicy — paliers fixes 1..7. */
export class FixedStepSpacedRepetitionPolicy implements SpacedRepetitionPolicy {
  computeNext(currentLevel: ReviewLevel, outcome: ReviewOutcome, today: LocalDate): NextReview {
    return computeNextReview(currentLevel, outcome, today);
  }
}
