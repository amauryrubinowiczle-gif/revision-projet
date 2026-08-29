import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type { Tag } from "@domain/entities/Tag";
import type { TagRepository } from "@domain/ports/TagRepository";
import { asTagId, type TagId } from "@domain/value-objects/Ids";
import * as schema from "../schema";
import { generateId } from "../ids";

export class DrizzleTagRepository implements TagRepository {
  constructor(private readonly db: SqliteRemoteDatabase<typeof schema>) {}

  async findAll(): Promise<Tag[]> {
    const rows = await this.db.select().from(schema.tags);
    return rows.map((row) => ({ id: asTagId(row.id), name: row.name, color: row.color }));
  }

  async create(name: string, color: string | null): Promise<TagId> {
    const id = generateId();
    await this.db.insert(schema.tags).values({ id, name, color });
    return asTagId(id);
  }
}
