import type { NewCardAggregate } from "../entities/NewCardAggregate";
import { DomainValidationError } from "../errors/DomainValidationError";

/** Invariants métier d'une fiche — appelé par CreateCardUseCase avant toute persistance. */
export function validateNewCard(input: NewCardAggregate): void {
  if (!input.title.trim()) {
    throw new DomainValidationError("Le titre de la fiche ne peut pas être vide.");
  }
  if (input.questions.length === 0) {
    throw new DomainValidationError("Une fiche doit contenir au moins une question.");
  }
  for (const q of input.questions) {
    if (!q.prompt.trim()) throw new DomainValidationError("Une question ne peut pas être vide.");
    if (!q.answerText.trim()) throw new DomainValidationError("Chaque question doit avoir une réponse.");
  }
}
