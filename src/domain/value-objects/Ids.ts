/**
 * Identifiants "brandés" : de simples chaînes UUID en pratique, mais des types distincts
 * à la compilation pour empêcher, par exemple, de passer un QuestionId là où un CardId
 * est attendu. Coût nul à l'exécution, garde-fou du compilateur uniquement.
 */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type CardId = Brand<string, "CardId">;
export type QuestionId = Brand<string, "QuestionId">;
export type RevisionSheetId = Brand<string, "RevisionSheetId">;
export type DefinitionId = Brand<string, "DefinitionId">;
export type ExerciseId = Brand<string, "ExerciseId">;
export type TagId = Brand<string, "TagId">;
export type CourseId = Brand<string, "CourseId">;
export type CommentId = Brand<string, "CommentId">;
export type ReviewSessionId = Brand<string, "ReviewSessionId">;
export type CardReviewEventId = Brand<string, "CardReviewEventId">;
export type QuestionReviewResultId = Brand<string, "QuestionReviewResultId">;
export type DefinitionReviewResultId = Brand<string, "DefinitionReviewResultId">;

export function asCardId(id: string): CardId {
  return id as CardId;
}
export function asQuestionId(id: string): QuestionId {
  return id as QuestionId;
}
export function asRevisionSheetId(id: string): RevisionSheetId {
  return id as RevisionSheetId;
}
export function asDefinitionId(id: string): DefinitionId {
  return id as DefinitionId;
}
export function asExerciseId(id: string): ExerciseId {
  return id as ExerciseId;
}
export function asTagId(id: string): TagId {
  return id as TagId;
}
export function asCourseId(id: string): CourseId {
  return id as CourseId;
}
export function asCommentId(id: string): CommentId {
  return id as CommentId;
}
export function asReviewSessionId(id: string): ReviewSessionId {
  return id as ReviewSessionId;
}
export function asCardReviewEventId(id: string): CardReviewEventId {
  return id as CardReviewEventId;
}
