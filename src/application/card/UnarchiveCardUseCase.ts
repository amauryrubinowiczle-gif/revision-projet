import type { CardRepository } from "@domain/ports/CardRepository";
import type { CardId } from "@domain/value-objects/Ids";

/** Remet une fiche archivée en activité (retour utilisateur) — symétrique d'ArchiveCardUseCase. */
export class UnarchiveCardUseCase {
  constructor(private readonly cardRepository: CardRepository) {}

  async execute(id: CardId): Promise<void> {
    await this.cardRepository.unarchive(id);
  }
}
