import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@infrastructure/di/container";
import { GetStatisticsUseCase } from "@application/statistics/GetStatisticsUseCase";
import { queryKeys } from "@ui/state/queryClient";

export function useStatistics() {
  return useQuery({
    queryKey: queryKeys.statistics,
    queryFn: () => {
      const { cardRepository, statisticsRepository, clock } = getContainer();
      return new GetStatisticsUseCase(cardRepository, statisticsRepository, clock).execute();
    },
  });
}
