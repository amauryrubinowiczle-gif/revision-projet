import type { CourseId } from "../value-objects/Ids";

export interface Course {
  id: CourseId;
  name: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}
