/** Levée quand un invariant métier est violé (ex. carte sans titre, sans aucune question). */
export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainValidationError";
  }
}
