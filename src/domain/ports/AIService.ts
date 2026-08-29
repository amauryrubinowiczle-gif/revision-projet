import type { Card } from "../entities/Card";
import type { Course } from "../entities/Course";
import type { Exercise } from "../entities/Exercise";
import type { NewCardAggregate } from "../entities/NewCardAggregate";
import type { Question } from "./../entities/Question";

/** Entrée générique pour une future génération de fiches depuis une source externe. */
export type SourceInput =
  | { kind: "pdf"; filePath: string }
  | { kind: "markdown"; content: string }
  | { kind: "image"; filePath: string }
  | { kind: "ocr"; filePath: string };

export interface VerificationResult {
  isCorrect: boolean;
  feedback: string;
}

/**
 * AIService — LE PORT D'ABSTRACTION IA demandé par le client. Aucune méthode ici ne doit
 * jamais laisser transparaître quel modèle (Claude, GPT, un autre, ou aucun) est branché
 * derrière : le reste du logiciel (application/, ui/) dépend UNIQUEMENT de cette interface.
 *
 * Aujourd'hui : implémentée par infrastructure/services/ai/NotImplementedAIService.ts,
 * qui lève NotImplementedError pour chaque méthode. Demain : un ClaudeAIService ou
 * GPTAIService implémentant exactement ce même contrat, branché dans
 * infrastructure/di/container.ts SANS modifier domain/ ni application/ ni ui/.
 */
export interface AIService {
  /** Future création automatique de fiches depuis PDF/Markdown/notes iPad/OCR/images. */
  generateCards(source: SourceInput): Promise<NewCardAggregate[]>;
  /** Future correction automatique des réponses de l'utilisateur. */
  verifyAnswer(question: Question, userAnswer: string): Promise<VerificationResult>;
  /** Future génération automatique d'une fiche de révision pour une question. */
  generateRevisionSheet(question: Question): Promise<string>;
  /** Future génération automatique de nouveaux exercices adaptés à une carte. */
  generateExercises(card: Card): Promise<Exercise[]>;
  /** Futur résumé automatique d'un cours. */
  summarizeCourse(course: Course): Promise<string>;
}
