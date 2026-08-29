/**
 * Levée par les adaptateurs IA non encore implémentés (voir
 * infrastructure/services/ai/NotImplementedAIService.ts). Le reste du logiciel n'a
 * jamais besoin de savoir QUEL modèle (Claude, GPT, ou aucun) est branché derrière
 * le port AIService — voir domain/ports/AIService.ts.
 */
export class NotImplementedError extends Error {
  constructor(featureName: string) {
    super(`Not implemented: ${featureName}`);
    this.name = "NotImplementedError";
  }
}
