import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@infrastructure/di/container";
import { StartReviewSessionUseCase } from "@application/review/StartReviewSessionUseCase";
import { StartCardReviewUseCase } from "@application/review/StartCardReviewUseCase";
import { CompleteCardReviewUseCase } from "@application/review/CompleteCardReviewUseCase";
import { EndReviewSessionUseCase } from "@application/review/EndReviewSessionUseCase";
import type { ReviewSessionPlan } from "@application/dto/ReviewSessionPlan";
import type { Card } from "@domain/entities/Card";
import type { CardId, CardReviewEventId, ReviewSessionId } from "@domain/value-objects/Ids";
import type { ReviewLevel } from "@domain/value-objects/ReviewLevel";
import type { ReviewOutcome } from "@domain/value-objects/ReviewOutcome";
import type { ExerciseId } from "@domain/value-objects/Ids";
import { queryKeys } from "@ui/state/queryClient";

/**
 * Démarre la session de révision une seule fois (StartReviewSessionUseCase crée une
 * ReviewSession en base — PAS une lecture idempotente, donc pas un simple useQuery ;
 * le ref garde contre le double-appel de React.StrictMode en développement).
 */
export function useStartReviewSession() {
  const [plan, setPlan] = useState<ReviewSessionPlan | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const { cardRepository, reviewHistoryRepository, exerciseRepository, clock } = getContainer();
    new StartReviewSessionUseCase(cardRepository, reviewHistoryRepository, exerciseRepository, clock)
      .execute()
      .then(setPlan)
      .catch((err: unknown) => setError(err instanceof Error ? err : new Error(String(err))));
  }, []);

  return { plan, error, isLoading: !plan && !error };
}

/** Ouvre le CardReviewEvent d'une carte — une seule fois par montage (une carte = un montage, voir CardReviewFlow `key`). */
export function useStartCardReview(sessionId: ReviewSessionId, cardId: CardId, currentLevel: ReviewLevel) {
  const [cardReviewEventId, setCardReviewEventId] = useState<CardReviewEventId | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const { reviewHistoryRepository } = getContainer();
    new StartCardReviewUseCase(reviewHistoryRepository).execute({ sessionId, cardId, currentLevel }).then(setCardReviewEventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return cardReviewEventId;
}

export function useCompleteCardReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      card: Card;
      cardReviewEventId: CardReviewEventId;
      userOutcome: ReviewOutcome;
      exerciseProposedId: ExerciseId | null;
      timeSpentSeconds: number | null;
    }) => {
      const { cardRepository, reviewHistoryRepository, clock } = getContainer();
      return new CompleteCardReviewUseCase(cardRepository, reviewHistoryRepository, clock).execute(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics });
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
}

export function useEndReviewSession() {
  return useMutation({
    mutationFn: (input: { sessionId: ReviewSessionId; cardsCompleted: number }) =>
      new EndReviewSessionUseCase(getContainer().reviewHistoryRepository).execute(input.sessionId, input.cardsCompleted),
  });
}
