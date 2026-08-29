import type { CardEditInput, CardRepository } from "@domain/ports/CardRepository";
import type { CardId } from "@domain/value-objects/Ids";
import { validateNewCard } from "@domain/policies/validateNewCard";

/**
 * Édition manuelle d'une fiche existante (retour utilisateur) — questions/définitions/
 * exercices/tags/niveau réécrits en bloc. Mêmes invariants qu'à la création
 * (validateNewCard s'applique : CardEditInput est un NewCardAggregate étendu).
 */
export class UpdateCardUseCase {
  constructor(private readonly cardRepository: CardRepository) {}

  async execute(id: CardId, input: CardEditInput): Promise<void> {
    validateNewCard(input);
    await this.cardRepository.updateWithChildren(id, input);
  }
}
