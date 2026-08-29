import { inArray } from "drizzle-orm";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type { Exercise } from "@domain/entities/Exercise";
import type { ExerciseRepository } from "@domain/ports/ExerciseRepository";
import { asCourseId, asExerciseId, type ExerciseId } from "@domain/value-objects/Ids";
import * as schema from "../schema";
import { generateId } from "../ids";

export class DrizzleExerciseRepository implements ExerciseRepository {
  constructor(private readonly db: SqliteRemoteDatabase<typeof schema>) {}

  async findByIds(ids: ExerciseId[]): Promise<Exercise[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(schema.exercises).where(inArray(schema.exercises.id, ids));
    return rows.map(this.toDomain);
  }

  async findAll(): Promise<Exercise[]> {
    const rows = await this.db.select().from(schema.exercises);
    return rows.map(this.toDomain);
  }

  async create(exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt">): Promise<ExerciseId> {
    const id = generateId();
    const now = new Date().toISOString();
    await this.db.insert(schema.exercises).values({
      id,
      title: exercise.title,
      description: exercise.description,
      reference: exercise.reference,
      difficulty: exercise.difficulty,
      courseId: exercise.courseId,
      createdAt: now,
      updatedAt: now,
    });
    return asExerciseId(id);
  }

  private toDomain(row: typeof schema.exercises.$inferSelect): Exercise {
    return {
      id: asExerciseId(row.id),
      title: row.title,
      description: row.description,
      reference: row.reference,
      difficulty: row.difficulty,
      courseId: row.courseId ? asCourseId(row.courseId) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
