import type { CardRepository, CardSummary, LibraryFilter, LibrarySort, PagedResult, Pagination } from "@domain/ports/CardRepository";

export class GetLibraryUseCase {
  constructor(private readonly cardRepository: CardRepository) {}

  async execute(filter: LibraryFilter, page: Pagination, sort?: LibrarySort): Promise<PagedResult<CardSummary>> {
    return this.cardRepository.findSummaries(filter, page, sort);
  }
}
