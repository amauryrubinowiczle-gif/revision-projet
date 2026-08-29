import type { CardRepository } from "@domain/ports/CardRepository";
import type { CardId } from "@domain/value-objects/Ids";

/**
 * "Supprimer" dans la Bibliothèque déclenche un archivage logique par défaut — l'historique
 * de révision est préservé pour les statistiques (voir section 4 du document d'architecture).
 */
export class ArchiveCardUseCase {
  constructor(private readonly cardRepository: CardRepository) {}

  async execute(id: CardId): Promise<void> {
    await this.cardRepository.archive(id);
  }
}
