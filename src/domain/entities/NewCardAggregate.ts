import type { CourseId, ExerciseId, TagId } from "../value-objects/Ids";

/**
 * Entrée de création d'une fiche complète (CreateCardUseCase). Pas encore d'ids —
 * ils sont générés par l'infrastructure au moment de la persistance transactionnelle.
 * C'est aussi la forme de sortie attendue de `AIService.generateCards()` (voir
 * domain/ports/AIService.ts) : une future création automatique de fiches par IA
 * produit exactement ce type, sans traitement spécial en aval.
 */
export interface NewQuestionInput {
  prompt: string;
  answerText: string;
  revisionSheetContent: string | null;
}

export interface NewDefinitionInput {
  term: string;
  expectedAnswer: string;
  linkedQuestionIndex: number | null; // index dans NewCardAggregate.questions, résolu à la persistance
}

export interface NewCardAggregate {
  title: string;
  courseId: CourseId | null;
  notes: string | null;
  questions: NewQuestionInput[];
  definitions: NewDefinitionInput[];
  exerciseIds: ExerciseId[];
  tagIds: TagId[];
}
