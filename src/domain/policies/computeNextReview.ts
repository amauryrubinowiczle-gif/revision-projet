import type { LocalDate } from "../value-objects/LocalDate";
import { MIN_REVIEW_LEVEL, nextReviewLevel, REVIEW_INTERVALS_DAYS, type ReviewLevel } from "../value-objects/ReviewLevel";
import type { ReviewOutcome } from "../value-objects/ReviewOutcome";
import type { NextReview } from "./SpacedRepetitionPolicy";

/**
 * LE MOTEUR DE RÉPÉTITION ESPACÉE — 100% pur, zéro dépendance (pas de DB, pas de React,
 * pas de Tauri, pas d'horloge système directe : `today` est injecté). Testable en isolation
 * totale, exactement comme l'exige le client.
 *
 * Règle (fixée par le brief) :
 *  - Échec  → retour au niveau 1, prochaine révision dès le lendemain.
 *  - Réussite → progression d'un niveau (plafonnée à 7), prochaine révision dans
 *    REVIEW_INTERVALS_DAYS[nouveauNiveau] jours.
 */
export function computeNextReview(currentLevel: ReviewLevel, outcome: ReviewOutcome, today: LocalDate): NextReview {
  if (outcome === "FAILURE") {
    return { level: MIN_REVIEW_LEVEL, nextReviewDate: today.plusDays(1) };
  }

  const level = nextReviewLevel(currentLevel);
  return { level, nextReviewDate: today.plusDays(REVIEW_INTERVALS_DAYS[level]) };
}
