import type { CardRepository } from "@domain/ports/CardRepository";
import type { Clock } from "@domain/ports/Clock";
import { getCardDueStatus } from "@domain/entities/Card";

export interface DashboardSummary {
  dueTodayCount: number;
  overdueCount: number;
  estimatedMinutes: number;
  /** Progression globale [0,1] : niveau moyen des fiches actives / niveau max (7). */
  overallProgressRatio: number;
}

/** Heuristique de départ, en attendant assez de données réelles (voir statistics/averageDailyReviewSeconds) pour affiner. */
const ESTIMATED_MINUTES_PER_CARD = 3;

export class GetDashboardSummaryUseCase {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<DashboardSummary> {
    const today = this.clock.today();
    const [dueCards, progress] = await Promise.all([this.cardRepository.findDueToday(today), this.cardRepository.getProgressSnapshot()]);

    let dueTodayCount = 0;
    let overdueCount = 0;
    for (const card of dueCards) {
      const status = getCardDueStatus(card, today);
      if (status === "OVERDUE") overdueCount += 1;
      else if (status === "DUE_TODAY") dueTodayCount += 1;
    }

    return {
      dueTodayCount,
      overdueCount,
      estimatedMinutes: dueCards.length * ESTIMATED_MINUTES_PER_CARD,
      overallProgressRatio: progress.averageLevelRatio,
    };
  }
}
