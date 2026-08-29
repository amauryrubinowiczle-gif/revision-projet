import type { AIService } from "@domain/ports/AIService";
import type { CardRepository } from "@domain/ports/CardRepository";
import type { Clock } from "@domain/ports/Clock";
import type { CourseRepository } from "@domain/ports/CourseRepository";
import type { ExerciseRepository } from "@domain/ports/ExerciseRepository";
import type { ReviewHistoryRepository } from "@domain/ports/ReviewHistoryRepository";
import type { StatisticsRepository } from "@domain/ports/StatisticsRepository";
import type { TagRepository } from "@domain/ports/TagRepository";

import { db } from "../database/tauri-sqlite-driver";
import { DrizzleCardRepository } from "../database/repositories/DrizzleCardRepository";
import { DrizzleCourseRepository } from "../database/repositories/DrizzleCourseRepository";
import { DrizzleExerciseRepository } from "../database/repositories/DrizzleExerciseRepository";
import { DrizzleReviewHistoryRepository } from "../database/repositories/DrizzleReviewHistoryRepository";
import { DrizzleStatisticsRepository } from "../database/repositories/DrizzleStatisticsRepository";
import { DrizzleTagRepository } from "../database/repositories/DrizzleTagRepository";
import { NotImplementedAIService } from "../services/ai/NotImplementedAIService";
import { SystemClock } from "../services/clock/SystemClock";

/**
 * COMPOSITION ROOT — le seul endroit du logiciel qui sait quelles implémentations
 * concrètes sont branchées derrière chaque port. Tout le reste (application/, ui/)
 * dépend uniquement des interfaces de domain/ports/.
 *
 * C'est ICI, et seulement ici, que basculer d'un adaptateur à un autre se fait :
 *  - remplacer NotImplementedAIService par ClaudeAIService quand l'IA sera branchée,
 *  - remplacer DrizzleCardRepository si l'ORM change un jour (voir risque n°9).
 */
export interface Container {
  cardRepository: CardRepository;
  reviewHistoryRepository: ReviewHistoryRepository;
  exerciseRepository: ExerciseRepository;
  courseRepository: CourseRepository;
  tagRepository: TagRepository;
  statisticsRepository: StatisticsRepository;
  clock: Clock;
  aiService: AIService;
}

let container: Container | null = null;

export function getContainer(): Container {
  if (!container) {
    container = {
      cardRepository: new DrizzleCardRepository(db),
      reviewHistoryRepository: new DrizzleReviewHistoryRepository(db),
      exerciseRepository: new DrizzleExerciseRepository(db),
      courseRepository: new DrizzleCourseRepository(db),
      tagRepository: new DrizzleTagRepository(db),
      statisticsRepository: new DrizzleStatisticsRepository(db),
      clock: new SystemClock(),
      aiService: new NotImplementedAIService(),
    };
  }
  return container;
}

/** Pour les tests : permet d'injecter des fakes sans passer par Drizzle/Tauri. */
export function setContainer(custom: Container): void {
  container = custom;
}
