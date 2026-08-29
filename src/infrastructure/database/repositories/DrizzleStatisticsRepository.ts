import { and, eq, gte } from "drizzle-orm";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type { DailyActivity, StatisticsRepository, StatisticsSnapshot } from "@domain/ports/StatisticsRepository";
import { LocalDate } from "@domain/value-objects/LocalDate";
import { isReviewLevel, MAX_REVIEW_LEVEL, MIN_REVIEW_LEVEL, type ReviewLevel } from "@domain/value-objects/ReviewLevel";
import * as schema from "../schema";

/**
 * Toutes les agrégations lisent card_review_events où completed = true UNIQUEMENT —
 * un événement provisoire (carte de révision commencée puis abandonnée en session,
 * voir schema.ts) ne doit jamais fausser le taux de réussite ni le streak.
 */
export class DrizzleStatisticsRepository implements StatisticsRepository {
  constructor(private readonly db: SqliteRemoteDatabase<typeof schema>) {}

  async getSnapshot(today: LocalDate): Promise<StatisticsSnapshot> {
    const completedEvents = await this.db.select().from(schema.cardReviewEvents).where(eq(schema.cardReviewEvents.completed, true));

    const successRate = completedEvents.length === 0 ? 0 : completedEvents.filter((e) => e.result === "SUCCESS").length / completedEvents.length;

    // Moyenne quotidienne : regroupe le temps passé par jour calendaire (reviewedAt tronqué à YYYY-MM-DD).
    const secondsByDay = new Map<string, number>();
    for (const e of completedEvents) {
      if (e.timeSpentSeconds == null) continue;
      const day = e.reviewedAt.slice(0, 10);
      secondsByDay.set(day, (secondsByDay.get(day) ?? 0) + e.timeSpentSeconds);
    }
    const daysWithTime = [...secondsByDay.values()];
    const averageDailyReviewSeconds = daysWithTime.length === 0 ? 0 : daysWithTime.reduce((a, b) => a + b, 0) / daysWithTime.length;

    // Streak : jours consécutifs (en remontant depuis aujourd'hui) ayant au moins un événement complété.
    const reviewedDays = new Set(completedEvents.map((e) => e.reviewedAt.slice(0, 10)));
    let consecutiveReviewDays = 0;
    let cursor = today;
    while (reviewedDays.has(cursor.toISODate())) {
      consecutiveReviewDays += 1;
      cursor = cursor.plusDays(-1);
    }

    const activeCards = await this.db.select().from(schema.cards).where(eq(schema.cards.isArchived, false));
    const masteredCardsCount = activeCards.filter((c) => c.currentLevel === 7).length;

    // "En difficulté" = le DERNIER événement complété de la carte est un échec.
    const latestResultByCard = new Map<string, string>();
    const sorted = [...completedEvents].sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
    for (const e of sorted) {
      if (e.cardId) latestResultByCard.set(e.cardId, e.result);
    }
    const strugglingCardsCount = [...latestResultByCard.values()].filter((r) => r === "FAILURE").length;

    return {
      averageDailyReviewSeconds,
      consecutiveReviewDays,
      successRate,
      masteredCardsCount,
      strugglingCardsCount,
    };
  }

  async getDailyActivity(today: LocalDate, days: number): Promise<DailyActivity[]> {
    const from = today.plusDays(-(days - 1));
    const rows = await this.db
      .select({ reviewedAt: schema.cardReviewEvents.reviewedAt, result: schema.cardReviewEvents.result })
      .from(schema.cardReviewEvents)
      .where(and(eq(schema.cardReviewEvents.completed, true), gte(schema.cardReviewEvents.reviewedAt, from.toISODate())));

    const successByDay = new Map<string, number>();
    const failureByDay = new Map<string, number>();
    for (const row of rows) {
      const day = row.reviewedAt.slice(0, 10);
      const target = row.result === "SUCCESS" ? successByDay : failureByDay;
      target.set(day, (target.get(day) ?? 0) + 1);
    }

    const activity: DailyActivity[] = [];
    for (let i = 0; i < days; i += 1) {
      const date = from.plusDays(i);
      const iso = date.toISODate();
      activity.push({ date, successCount: successByDay.get(iso) ?? 0, failureCount: failureByDay.get(iso) ?? 0 });
    }
    return activity;
  }

  async getLevelDistribution(): Promise<Record<ReviewLevel, number>> {
    const rows = await this.db
      .select({ currentLevel: schema.cards.currentLevel })
      .from(schema.cards)
      .where(eq(schema.cards.isArchived, false));

    const distribution = {} as Record<ReviewLevel, number>;
    for (let level = MIN_REVIEW_LEVEL; level <= MAX_REVIEW_LEVEL; level += 1) {
      distribution[level as ReviewLevel] = 0;
    }
    for (const row of rows) {
      if (isReviewLevel(row.currentLevel)) distribution[row.currentLevel] += 1;
    }
    return distribution;
  }
}
