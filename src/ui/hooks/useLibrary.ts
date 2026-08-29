import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@infrastructure/di/container";
import { GetLibraryUseCase } from "@application/card/GetLibraryUseCase";
import type { LibraryFilter, LibrarySort, Pagination } from "@domain/ports/CardRepository";
import { queryKeys } from "@ui/state/queryClient";

export function useLibrary(filter: LibraryFilter, page: Pagination, sort?: LibrarySort) {
  return useQuery({
    queryKey: queryKeys.library({ filter, page, sort }),
    queryFn: () => {
      const { cardRepository } = getContainer();
      return new GetLibraryUseCase(cardRepository).execute(filter, page, sort);
    },
  });
}
