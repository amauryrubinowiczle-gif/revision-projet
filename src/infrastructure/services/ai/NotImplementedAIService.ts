import type { AIService, SourceInput, VerificationResult } from "@domain/ports/AIService";
import type { Card } from "@domain/entities/Card";
import type { Course } from "@domain/entities/Course";
import type { Exercise } from "@domain/entities/Exercise";
import type { NewCardAggregate } from "@domain/entities/NewCardAggregate";
import type { Question } from "@domain/entities/Question";
import { NotImplementedError } from "@domain/errors/NotImplementedError";

/**
 * LE STUB IA — adaptateur par défaut du port AIService tant qu'aucun modèle n'est
 * branché. Chaque méthode lève NotImplementedError. Le jour où un vrai fournisseur
 * (Claude, GPT, ou autre) est intégré, il suffit d'écrire un nouvel adaptateur
 * (ex. ClaudeAIService implements AIService) et de changer UNE ligne dans
 * infrastructure/di/container.ts — domain/, application/ et ui/ ne changent pas.
 */
export class NotImplementedAIService implements AIService {
  async generateCards(_source: SourceInput): Promise<NewCardAggregate[]> {
    throw new NotImplementedError("AIService.generateCards");
  }

  async verifyAnswer(_question: Question, _userAnswer: string): Promise<VerificationResult> {
    throw new NotImplementedError("AIService.verifyAnswer");
  }

  async generateRevisionSheet(_question: Question): Promise<string> {
    throw new NotImplementedError("AIService.generateRevisionSheet");
  }

  async generateExercises(_card: Card): Promise<Exercise[]> {
    throw new NotImplementedError("AIService.generateExercises");
  }

  async summarizeCourse(_course: Course): Promise<string> {
    throw new NotImplementedError("AIService.summarizeCourse");
  }
}
