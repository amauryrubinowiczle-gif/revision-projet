import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type { Course } from "@domain/entities/Course";
import type { CourseRepository } from "@domain/ports/CourseRepository";
import { asCourseId, type CourseId } from "@domain/value-objects/Ids";
import * as schema from "../schema";
import { generateId } from "../ids";

export class DrizzleCourseRepository implements CourseRepository {
  constructor(private readonly db: SqliteRemoteDatabase<typeof schema>) {}

  async findAll(): Promise<Course[]> {
    const rows = await this.db.select().from(schema.courses);
    return rows.map((row) => ({
      id: asCourseId(row.id),
      name: row.name,
      color: row.color,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  async create(name: string, color: string | null): Promise<CourseId> {
    const id = generateId();
    const now = new Date().toISOString();
    await this.db.insert(schema.courses).values({ id, name, color, createdAt: now, updatedAt: now });
    return asCourseId(id);
  }
}
