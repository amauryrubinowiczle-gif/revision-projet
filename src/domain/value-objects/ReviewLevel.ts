/**
 * ReviewLevel — le palier courant d'une fiche dans la progression à paliers fixes
 * demandée par le client : 1,2,3,4,5,6,7 jours. Le niveau EST directement le nombre
 * de jours avant la prochaine révision en cas de réussite.
 */
export type ReviewLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const MIN_REVIEW_LEVEL: ReviewLevel = 1;
export const MAX_REVIEW_LEVEL: ReviewLevel = 7;

export const REVIEW_INTERVALS_DAYS: Readonly<Record<ReviewLevel, number>> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
};

export function isReviewLevel(value: number): value is ReviewLevel {
  return Number.isInteger(value) && value >= MIN_REVIEW_LEVEL && value <= MAX_REVIEW_LEVEL;
}

export function nextReviewLevel(current: ReviewLevel): ReviewLevel {
  return Math.min(current + 1, MAX_REVIEW_LEVEL) as ReviewLevel;
}
