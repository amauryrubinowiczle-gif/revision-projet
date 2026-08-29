import type { TagId } from "../value-objects/Ids";

export interface Tag {
  id: TagId;
  name: string;
  color: string | null;
}
