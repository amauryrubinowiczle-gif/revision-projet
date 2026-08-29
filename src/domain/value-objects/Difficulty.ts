/** Niveau de difficulté d'un Exercise, utilisé pour la sélection adaptée au niveau courant. */
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export const DIFFICULTY_ORDER: Readonly<Record<Difficulty, number>> = {
  EASY: 0,
  MEDIUM: 1,
  HARD: 2,
};
