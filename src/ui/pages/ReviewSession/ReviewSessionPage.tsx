import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@ui/components/EmptyState";
import { StatTile } from "@ui/components/StatTile";
import { useEndReviewSession, useStartReviewSession } from "@ui/hooks/useReviewSession";
import { CardReviewFlow } from "./CardReviewFlow";

/**
 * Session de révision — voir flux complet en section 5.3 du document d'architecture.
 * Cet écran orchestre la progression entre les cartes ; le déroulé d'UNE carte
 * (question -> réponse -> fiche de révision -> définitions -> exercice -> résumé ->
 * verdict) vit dans CardReviewFlow.
 */
export function ReviewSessionPage() {
  const { plan, error, isLoading } = useStartReviewSession();
  const endSession = useEndReviewSession();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold">Réviser</h1>
        <p className="mt-8 text-sm text-ink-muted">Préparation de la session…</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold">Réviser</h1>
        <p className="mt-8 text-sm text-danger">Impossible de démarrer la session de révision.</p>
      </div>
    );
  }

  if (plan.cards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold">Réviser</h1>
        <div className="mt-8">
          <EmptyState title="Rien à réviser aujourd'hui" description="Toutes les fiches dues ont déjà été traitées. Revenez demain." />
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold">Session terminée</h1>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatTile label="Fiches révisées" value={String(completedCount)} />
          <StatTile label="Prévues aujourd'hui" value={String(plan.cards.length)} />
        </div>
        <div className="mt-8 flex gap-3">
          <Link to="/" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-raised">
            Retour à l'accueil
          </Link>
          <Link to="/library" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-raised">
            Bibliothèque
          </Link>
        </div>
      </div>
    );
  }

  const current = plan.cards[currentCardIndex];
  if (!current) return null;

  async function handleCardDone() {
    const finishedCount = completedCount + 1;
    setCompletedCount(finishedCount);
    const nextIndex = currentCardIndex + 1;
    if (nextIndex >= plan!.cards.length) {
      await endSession.mutateAsync({ sessionId: plan!.sessionId, cardsCompleted: finishedCount });
      setSessionComplete(true);
    } else {
      setCurrentCardIndex(nextIndex);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Réviser</h1>
        <span className="text-sm text-ink-muted">
          Fiche {currentCardIndex + 1} / {plan.cards.length}
        </span>
      </div>
      <CardReviewFlow
        key={current.card.id}
        sessionId={plan.sessionId}
        card={current.card}
        availableExercises={current.availableExercises}
        onDone={handleCardDone}
      />
    </div>
  );
}
