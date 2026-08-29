import type { QuestionId, RevisionSheetId } from "../value-objects/Ids";

/**
 * Une RevisionSheet par Question (relation 1–0..1) — jamais partagée entre questions,
 * jamais au niveau de la Card. Affichée uniquement après un échec sur SA question.
 */
export interface RevisionSheet {
  id: RevisionSheetId;
  questionId: QuestionId;
  content: string; // markdown
  createdAt: Date;
  updatedAt: Date;
}
