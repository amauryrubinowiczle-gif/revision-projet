import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@infrastructure/di/container";
import { GetDashboardSummaryUseCase } from "@application/dashboard/GetDashboardSummaryUseCase";
import { queryKeys } from "@ui/state/queryClient";

/**
 * Le hook construit le use case à partir de la composition root (infrastructure/di/container.ts)
 * — c'est le SEUL endroit de l'UI qui sait que le Dashboard a besoin de CardRepository/Clock ;
 * le composant React, lui, ne voit qu'un objet DashboardSummary.
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => {
      const { cardRepository, clock } = getContainer();
      return new GetDashboardSummaryUseCase(cardRepository, clock).execute();
    },
  });
}
