import { describe, expect, it } from "vitest";
import { GetStatisticsUseCase } from "@application/statistics/GetStatisticsUseCase";
import { LocalDate } from "@domain/value-objects/LocalDate";
import { asCardId } from "@domain/value-objects/Ids";
import { FakeCardRepository, FakeClock, FakeStatisticsRepository, makeTestCard } from "./fakes";

const TODAY = LocalDate.fromISODate("2026-08-29");

describe("GetStatisticsUseCase", () => {
  it("assemble le total de fiches, le snapshot, l'activité quotidienne et la répartition par niveau", async () => {
    const cardRepository = new FakeCardRepository();
    cardRepository.seed(makeTestCard({ id: asCardId("a") }));
    cardRepository.seed(makeTestCard({ id: asCardId("b") }));

    const statisticsRepository = new FakeStatisticsRepository();
    statisticsRepository.snapshot = {
      averageDailyReviewSeconds: 120,
      consecutiveReviewDays: 3,
      successRate: 0.75,
      masteredCardsCount: 1,
      strugglingCardsCount: 2,
    };
    statisticsRepository.dailyActivity = [{ date: TODAY, successCount: 2, failureCount: 1 }];
    statisticsRepository.levelDistribution = { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1 };

    const result = await new GetStatisticsUseCase(cardRepository, statisticsRepository, new FakeClock(TODAY)).execute();

    expect(result.totalCards).toBe(2);
    expect(result.averageDailyReviewSeconds).toBe(120);
    expect(result.consecutiveReviewDays).toBe(3);
    expect(result.successRate).toBe(0.75);
    expect(result.masteredCardsCount).toBe(1);
    expect(result.strugglingCardsCount).toBe(2);
    expect(result.dailyActivity).toEqual([{ date: TODAY, successCount: 2, failureCount: 1 }]);
    expect(result.levelDistribution).toEqual({ 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1 });
  });
});
