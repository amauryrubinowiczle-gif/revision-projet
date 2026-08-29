import type { CardRepository } from "@domain/ports/CardRepository";
import type { ReviewHistoryRepository } from "@domain/ports/ReviewHistoryRepository";
import type { ExerciseRepository } from "@domain/ports/ExerciseRepository";
import type { Clock } from "@domain/ports/Clock";
import type { ReviewSessionPlan } from "../dto/ReviewSessionPlan";

/**
 * Étape 1-2 du flux "Réviser aujourd'hui" (section 5.3) : récupère les fiches dues,
 * ouvre une ReviewSession, et pré-résout les exercices disponibles pour chaque carte
 * (pour que domain/policies/selectExercise.ts puisse s'exécuter sans appel réseau/DB
 * supplémentaire pendant la session).
 */
export class StartReviewSessionUseCase {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly reviewHistoryRepository: ReviewHistoryRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<ReviewSessionPlan> {
    const today = this.clock.today();
    const dueCards = await this.cardRepository.findDueToday(today);

    const sessionId = await this.reviewHistoryRepository.createSession({
      startedAt: this.clock.now(),
      cardsPlanned: dueCards.length,
    });

    const cards = await Promise.all(
      dueCards.map(async (card) => ({
        card,
        availableExercises: await this.exerciseRepository.findByIds(card.exerciseRefs.map((ref) => ref.exerciseId)),
      })),
    );

    return { sessionId, cards };
  }
}
