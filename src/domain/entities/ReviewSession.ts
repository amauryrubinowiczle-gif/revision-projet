import type { ReviewSessionId } from "../value-objects/Ids";

/** Un lancement du bouton "Réviser" — regroupe toutes les cartes traitées ce jour-là. */
export interface ReviewSession {
  id: ReviewSessionId;
  startedAt: Date;
  endedAt: Date | null;
  cardsPlanned: number;
  cardsCompleted: number;
}
