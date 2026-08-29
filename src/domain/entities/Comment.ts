import type { CardId, CommentId } from "../value-objects/Ids";

/** Historique d'annotations horodatées sur une fiche — distinct du champ `notes` unique de Card. */
export interface Comment {
  id: CommentId;
  cardId: CardId;
  body: string;
  createdAt: Date;
}
