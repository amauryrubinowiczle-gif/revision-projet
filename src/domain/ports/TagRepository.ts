import type { Tag } from "../entities/Tag";
import type { TagId } from "../value-objects/Ids";

export interface TagRepository {
  findAll(): Promise<Tag[]>;
  create(name: string, color: string | null): Promise<TagId>;
}
