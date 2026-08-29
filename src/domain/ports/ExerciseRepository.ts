import type { Exercise } from "../entities/Exercise";
import type { ExerciseId } from "../value-objects/Ids";

/** Port du repository de la banque d'exercices (entité indépendante, réutilisable entre fiches — voir section 3). */
export interface ExerciseRepository {
  findByIds(ids: ExerciseId[]): Promise<Exercise[]>;
  findAll(): Promise<Exercise[]>;
  create(exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt">): Promise<ExerciseId>;
}
