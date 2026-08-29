import type { CardRepository } from "@domain/ports/CardRepository";
import type { DailyActivity, StatisticsRepository } from "@domain/ports/StatisticsRepository";
import type { Clock } from "@domain/ports/Clock";
import type { ReviewLevel } from "@domain/value-objects/ReviewLevel";

/** Fenêtre du graphique d'activité — 14 jours glissants, un compromis lisible sans contrôle de plage (Phase 6). */
const ACTIVITY_WINDOW_DAYS = 14;

export interface StatisticsView {
  totalCards: number;
  averageDailyReviewSeconds: number;
  consecutiveReviewDays: number;
  successRate: number;
  masteredCardsCount: number;
  strugglingCardsCount: number;
  dailyActivity: DailyActivity[];
  levelDistribution: Record<ReviewLevel, number>;
}

export class GetStatisticsUseCase {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly statisticsRepository: StatisticsRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<StatisticsView> {
    const today = this.clock.today();
    const [totalCards, snapshot, dailyActivity, levelDistribution] = await Promise.all([
      this.cardRepository.countAll(),
      this.statisticsRepository.getSnapshot(today),
      this.statisticsRepository.getDailyActivity(today, ACTIVITY_WINDOW_DAYS),
      this.statisticsRepository.getLevelDistribution(),
    ]);

    return {
      totalCards,
      averageDailyReviewSeconds: snapshot.averageDailyReviewSeconds,
      consecutiveReviewDays: snapshot.consecutiveReviewDays,
      successRate: snapshot.successRate,
      masteredCardsCount: snapshot.masteredCardsCount,
      strugglingCardsCount: snapshot.strugglingCardsCount,
      dailyActivity,
      levelDistribution,
    };
  }
}
