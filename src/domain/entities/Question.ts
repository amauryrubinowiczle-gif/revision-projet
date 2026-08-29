import type { CardId, QuestionId } from "../value-objects/Ids";
import type { RevisionSheet } from "./RevisionSheet";

/**
 * Une Question n'est PAS une Card — une Card en contient plusieurs. Chaque Question
 * porte sa propre réponse attendue et sa propre RevisionSheet.
 */
export interface Question {
  id: QuestionId;
  cardId: CardId;
  order: number;
  prompt: string;
  answerText: string;
  revisionSheet: RevisionSheet | null;
  createdAt: Date;
  updatedAt: Date;
}
