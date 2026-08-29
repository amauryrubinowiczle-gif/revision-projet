import type { ReviewOutcome } from "../value-objects/ReviewOutcome";

export interface CardResultsSummary {
  questionsSucceeded: number;
  questionsTotal: number;
  definitionsSucceeded: number;
  definitionsTotal: number;
}

/**
 * PAS une décision — un résumé factuel. Conformément au choix explicite de l'utilisateur
 * (voir section 5.3 du document d'architecture), l'application n'agrège JAMAIS
 * automatiquement les résultats question par question en un verdict de carte : elle
 * affiche ce résumé, et c'est l'utilisateur qui décide s'il considère la fiche comme
 * globalement maîtrisée (ce verdict alimente ensuite computeNextReview).
 */
export function summarizeCardResults(
  questionResults: ReviewOutcome[],
  definitionResults: ReviewOutcome[],
): CardResultsSummary {
  const countSuccess = (results: ReviewOutcome[]) => results.filter((r) => r === "SUCCESS").length;

  return {
    questionsSucceeded: countSuccess(questionResults),
    questionsTotal: questionResults.length,
    definitionsSucceeded: countSuccess(definitionResults),
    definitionsTotal: definitionResults.length,
  };
}
