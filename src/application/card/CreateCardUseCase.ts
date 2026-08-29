import type { CardRepository } from "@domain/ports/CardRepository";
import type { NewCardAggregate } from "@domain/entities/NewCardAggregate";
import type { CardId } from "@domain/value-objects/Ids";
import { validateNewCard } from "@domain/policies/validateNewCard";

export class CreateCardUseCase {
  constructor(private readonly cardRepository: CardRepository) {}

  async execute(input: NewCardAggregate): Promise<CardId> {
    validateNewCard(input);
    return this.cardRepository.createWithChildren(input);
  }
}
