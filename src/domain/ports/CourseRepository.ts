import type { Course } from "../entities/Course";
import type { CourseId } from "../value-objects/Ids";

export interface CourseRepository {
  findAll(): Promise<Course[]>;
  create(name: string, color: string | null): Promise<CourseId>;
}
