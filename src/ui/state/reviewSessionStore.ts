import { create } from "zustand";
import type { Exercise } from "@domain/entities/Exercise";
import type { ReviewOutcome } from "@domain/value-objects/ReviewOutcome";

/**
 * Machine d'état de l'écran de révision pour LA CARTE EN COURS — état UI local et
 * éphémère, distinct des données serveur (TanStack Query). Voir flux 5.3 du document
 * d'architecture : question -> réponse -> auto-évaluation -> (fiche de révision si
 * échec) -> définitions (même mécanisme) -> exercice -> résumé -> verdict utilisateur.
 *
 * Scope volontairement limité à UNE carte : la progression au sein de la session
 * (quelle carte, combien terminées) vit dans ReviewSessionPage (état de page classique),
 * pas ici — ce store est réinitialisé (resetForNewCard) à chaque nouvelle carte.
 */
export type ReviewStep =
  | "SHOW_QUESTION"
  | "SHOW_QUESTION_ANSWER"
  | "SHOW_REVISION_SHEET"
  | "SHOW_DEFINITION"
  | "SHOW_DEFINITION_ANSWER"
  | "SHOW_EXERCISE"
  | "CARD_SUMMARY";

interface ReviewSessionState {
  step: ReviewStep;
  currentQuestionIndex: number;
  currentDefinitionIndex: number;
  questionResults: ReviewOutcome[];
  definitionResults: ReviewOutcome[];
  selectedExercise: Exercise | null;

  goToStep: (step: ReviewStep) => void;
  recordQuestionResult: (result: ReviewOutcome) => void;
  advanceQuestion: () => void;
  recordDefinitionResult: (result: ReviewOutcome) => void;
  advanceDefinition: () => void;
  setSelectedExercise: (exercise: Exercise | null) => void;
  resetForNewCard: () => void;
}

const initialCardState = {
  step: "SHOW_QUESTION" as ReviewStep,
  currentQuestionIndex: 0,
  currentDefinitionIndex: 0,
  questionResults: [] as ReviewOutcome[],
  definitionResults: [] as ReviewOutcome[],
  selectedExercise: null as Exercise | null,
};

export const useReviewSessionStore = create<ReviewSessionState>((set) => ({
  ...initialCardState,
  goToStep: (step) => set({ step }),
  recordQuestionResult: (result) => set((s) => ({ questionResults: [...s.questionResults, result] })),
  advanceQuestion: () => set((s) => ({ currentQuestionIndex: s.currentQuestionIndex + 1, step: "SHOW_QUESTION" })),
  recordDefinitionResult: (result) => set((s) => ({ definitionResults: [...s.definitionResults, result] })),
  advanceDefinition: () => set((s) => ({ currentDefinitionIndex: s.currentDefinitionIndex + 1, step: "SHOW_DEFINITION" })),
  setSelectedExercise: (exercise) => set({ selectedExercise: exercise }),
  resetForNewCard: () => set({ ...initialCardState, questionResults: [], definitionResults: [] }),
}));
