import type { CardId, DefinitionId, QuestionId } from "../value-objects/Ids";

export interface Definition {
  id: DefinitionId;
  cardId: CardId;
  term: string;
  expectedAnswer: string;
  order: number;
  /** Rattachement optionnel à une question précise (extension proposée en section 8). */
  linkedQuestionId: QuestionId | null;
}
