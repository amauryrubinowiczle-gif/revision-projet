import type { Exercise } from "../entities/Exercise";
import { DIFFICULTY_ORDER, type Difficulty } from "../value-objects/Difficulty";
import type { ReviewLevel } from "../value-objects/ReviewLevel";
import type { CardResultsSummary } from "./summarizeCardResults";

/**
 * Sélectionne, parmi les exercices référencés par la carte, celui adapté au niveau
 * actuel de progression et à la présence d'échecs récents sur cette session :
 *  - Des échecs sur les questions/définitions de la carte → exercice plus facile
 *    (renforcement), quel que soit le niveau.
 *  - Sinon, la difficulté suit le niveau de progression (paliers 1-2 → EASY,
 *    3-5 → MEDIUM, 6-7 → HARD), avec repli sur le plus proche disponible.
 *
 * Politique isolée et remplaçable — testable indépendamment de l'UI et de la DB.
 */
export function selectExercise(
  currentLevel: ReviewLevel,
  resultsSoFar: CardResultsSummary,
  availableExercises: Exercise[],
): Exercise | null {
  if (availableExercises.length === 0) return null;

  const hasRecentFailure =
    resultsSoFar.questionsSucceeded < resultsSoFar.questionsTotal ||
    resultsSoFar.definitionsSucceeded < resultsSoFar.definitionsTotal;

  const targetDifficulty: Difficulty = hasRecentFailure ? "EASY" : currentLevel <= 2 ? "EASY" : currentLevel <= 5 ? "MEDIUM" : "HARD";

  const sorted = [...availableExercises].sort(
    (a, b) =>
      Math.abs(DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[targetDifficulty]) -
      Math.abs(DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[targetDifficulty]),
  );

  return sorted[0] ?? null;
}
