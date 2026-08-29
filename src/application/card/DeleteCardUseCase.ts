import type { CardRepository } from "@domain/ports/CardRepository";
import type { CardId } from "@domain/value-objects/Ids";

/** Suppression physique définitive — action explicite séparée (ex. depuis une vue "archives"), pas le comportement par défaut. */
export class DeleteCardUseCase {
  constructor(private readonly cardRepository: CardRepository) {}

  async execute(id: CardId): Promise<void> {
    await this.cardRepository.delete(id);
  }
}
