import type { CourseId, ExerciseId } from "../value-objects/Ids";
import type { Difficulty } from "../value-objects/Difficulty";

/**
 * Exercise est une entité INDÉPENDANTE, jamais imbriquée dans Card : le brief précise
 * que "les exercices ne sont pas écrits dans la fiche" — la fiche référence seulement
 * quel exercice réaliser (voir CardExercise, relation N–N, dans le schéma DB).
 */
export interface Exercise {
  id: ExerciseId;
  title: string;
  description: string | null;
  /** Pointeur externe : chemin de fichier, URL, référence de manuel — jamais le contenu de l'exercice lui-même. */
  reference: string | null;
  difficulty: Difficulty;
  courseId: CourseId | null;
  createdAt: Date;
  updatedAt: Date;
}
