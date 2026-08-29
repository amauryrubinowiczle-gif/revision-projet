import { useEffect, useRef, useState } from "react";
import { getContainer } from "@infrastructure/di/container";
import { SubmitQuestionResultUseCase } from "@application/review/SubmitQuestionResultUseCase";
import { SubmitDefinitionResultUseCase } from "@application/review/SubmitDefinitionResultUseCase";
import { summarizeCardResults } from "@domain/policies/summarizeCardResults";
import { selectExercise } from "@domain/policies/selectExercise";
import type { Card } from "@domain/entities/Card";
import type { Exercise } from "@domain/entities/Exercise";
import type { ReviewSessionId } from "@domain/value-objects/Ids";
import type { ReviewOutcome } from "@domain/value-objects/ReviewOutcome";
import { useReviewSessionStore } from "@ui/state/reviewSessionStore";
import { useCompleteCardReview, useStartCardReview } from "@ui/hooks/useReviewSession";

const DIFFICULTY_LABELS: Record<Exercise["difficulty"], string> = {
  EASY: "Facile",
  MEDIUM: "Moyen",
  HARD: "Difficile",
};

function ShortcutHint({ label }: { label: string }) {
  return <span className="ml-1.5 font-normal opacity-70">{label}</span>;
}

const buttonBase = "rounded-md px-4 py-2 text-sm font-medium transition-colors";
const successButtonClass = `${buttonBase} bg-success text-white hover:opacity-90`;
const failureButtonClass = `${buttonBase} bg-danger text-white hover:opacity-90`;
const neutralButtonClass = `${buttonBase} border border-border hover:bg-surface-raised`;

interface CardReviewFlowProps {
  sessionId: ReviewSessionId;
  card: Card;
  availableExercises: Exercise[];
  onDone: () => void;
}

/**
 * Traite UNE carte de bout en bout (flux 5.3 du document d'architecture). Remonté avec
 * une `key={card.id}` par le parent à chaque nouvelle carte : l'effet de montage
 * (StartCardReviewUseCase, reset du store) ne s'exécute donc qu'une fois par carte.
 */
export function CardReviewFlow({ sessionId, card, availableExercises, onDone }: CardReviewFlowProps) {
  const cardReviewEventId = useStartCardReview(sessionId, card.id, card.currentLevel);
  const completeCardReview = useCompleteCardReview();
  const [busy, setBusy] = useState(false);
  const cardStartedAtRef = useRef(Date.now());
  const stepStartedAtRef = useRef(Date.now());

  const step = useReviewSessionStore((s) => s.step);
  const currentQuestionIndex = useReviewSessionStore((s) => s.currentQuestionIndex);
  const currentDefinitionIndex = useReviewSessionStore((s) => s.currentDefinitionIndex);
  const questionResults = useReviewSessionStore((s) => s.questionResults);
  const definitionResults = useReviewSessionStore((s) => s.definitionResults);
  const selectedExercise = useReviewSessionStore((s) => s.selectedExercise);
  const goToStep = useReviewSessionStore((s) => s.goToStep);
  const recordQuestionResult = useReviewSessionStore((s) => s.recordQuestionResult);
  const advanceQuestion = useReviewSessionStore((s) => s.advanceQuestion);
  const recordDefinitionResult = useReviewSessionStore((s) => s.recordDefinitionResult);
  const advanceDefinition = useReviewSessionStore((s) => s.advanceDefinition);
  const setSelectedExercise = useReviewSessionStore((s) => s.setSelectedExercise);
  const resetForNewCard = useReviewSessionStore((s) => s.resetForNewCard);

  useEffect(() => {
    resetForNewCard();
    cardStartedAtRef.current = Date.now();
    stepStartedAtRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stepStartedAtRef.current = Date.now();
  }, [step, currentQuestionIndex, currentDefinitionIndex]);

  function elapsedSeconds(): number {
    return Math.max(0, Math.round((Date.now() - stepStartedAtRef.current) / 1000));
  }

  function proceedToExercise() {
    const summary = summarizeCardResults(questionResults, definitionResults);
    const exercise = selectExercise(card.currentLevel, summary, availableExercises);
    setSelectedExercise(exercise);
    goToStep(exercise ? "SHOW_EXERCISE" : "CARD_SUMMARY");
  }

  function advanceAfterQuestion() {
    if (currentQuestionIndex + 1 < card.questions.length) {
      advanceQuestion();
    } else if (card.definitions.length > 0) {
      goToStep("SHOW_DEFINITION");
    } else {
      proceedToExercise();
    }
  }

  function advanceAfterDefinition() {
    if (currentDefinitionIndex + 1 < card.definitions.length) {
      advanceDefinition();
    } else {
      proceedToExercise();
    }
  }

  async function handleQuestionOutcome(outcome: ReviewOutcome) {
    if (!cardReviewEventId || busy) return;
    const question = card.questions[currentQuestionIndex];
    if (!question) return;
    setBusy(true);
    const revisionSheetShown = outcome === "FAILURE" && question.revisionSheet !== null;
    try {
      await new SubmitQuestionResultUseCase(getContainer().reviewHistoryRepository).execute({
        cardReviewEventId,
        questionId: question.id,
        result: outcome,
        revisionSheetShown,
        timeSpentSeconds: elapsedSeconds(),
      });
      recordQuestionResult(outcome);
      if (revisionSheetShown) {
        goToStep("SHOW_REVISION_SHEET");
      } else {
        advanceAfterQuestion();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDefinitionOutcome(outcome: ReviewOutcome) {
    if (!cardReviewEventId || busy) return;
    const definition = card.definitions[currentDefinitionIndex];
    if (!definition) return;
    setBusy(true);
    try {
      await new SubmitDefinitionResultUseCase(getContainer().reviewHistoryRepository).execute({
        cardReviewEventId,
        definitionId: definition.id,
        result: outcome,
      });
      recordDefinitionResult(outcome);
      advanceAfterDefinition();
    } finally {
      setBusy(false);
    }
  }

  async function handleVerdict(outcome: ReviewOutcome) {
    if (!cardReviewEventId || busy) return;
    setBusy(true);
    try {
      await completeCardReview.mutateAsync({
        card,
        cardReviewEventId,
        userOutcome: outcome,
        exerciseProposedId: selectedExercise?.id ?? null,
        timeSpentSeconds: Math.round((Date.now() - cardStartedAtRef.current) / 1000),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  // Raccourcis clavier — l'écran à plus forte répétition de l'app (voir brief "orienté
  // concentration") : autant éviter l'aller-retour souris pour l'action la plus fréquente.
  // Un seul listener, abonné une fois (pas de résubscription à chaque rendu) ; il lit
  // toujours l'état/les callbacks les plus récents via cette ref (pattern "latest ref"),
  // plutôt que de recréer l'écouteur à chaque frappe de `busy`/`step`.
  const latestRef = useRef({ step, busy, goToStep, handleQuestionOutcome, handleDefinitionOutcome, handleVerdict, advanceAfterQuestion });
  useEffect(() => {
    latestRef.current = { step, busy, goToStep, handleQuestionOutcome, handleDefinitionOutcome, handleVerdict, advanceAfterQuestion };
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const current = latestRef.current;
      if (e.metaKey || e.ctrlKey || e.altKey || current.busy) return;
      const key = e.key.toLowerCase();
      const isConfirmKey = key === "enter" || key === " ";
      switch (current.step) {
        case "SHOW_QUESTION":
          if (isConfirmKey) {
            e.preventDefault();
            current.goToStep("SHOW_QUESTION_ANSWER");
          }
          break;
        case "SHOW_QUESTION_ANSWER":
          if (key === "r") void current.handleQuestionOutcome("SUCCESS");
          else if (key === "e") void current.handleQuestionOutcome("FAILURE");
          break;
        case "SHOW_REVISION_SHEET":
          if (isConfirmKey) {
            e.preventDefault();
            current.advanceAfterQuestion();
          }
          break;
        case "SHOW_DEFINITION":
          if (isConfirmKey) {
            e.preventDefault();
            current.goToStep("SHOW_DEFINITION_ANSWER");
          }
          break;
        case "SHOW_DEFINITION_ANSWER":
          if (key === "r") void current.handleDefinitionOutcome("SUCCESS");
          else if (key === "e") void current.handleDefinitionOutcome("FAILURE");
          break;
        case "SHOW_EXERCISE":
          if (isConfirmKey) {
            e.preventDefault();
            current.goToStep("CARD_SUMMARY");
          }
          break;
        case "CARD_SUMMARY":
          if (key === "o") void current.handleVerdict("SUCCESS");
          else if (key === "n") void current.handleVerdict("FAILURE");
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!cardReviewEventId) {
    return <p className="text-sm text-ink-muted">Préparation de la fiche…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">{card.title}</h2>
        <p className="text-xs text-ink-muted">Niveau {card.currentLevel}/7</p>
      </div>

      {step === "SHOW_QUESTION" && card.questions[currentQuestionIndex] && (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
          <p className="text-xs text-ink-muted">
            Question {currentQuestionIndex + 1} / {card.questions.length}
          </p>
          <p className="text-base">{card.questions[currentQuestionIndex].prompt}</p>
          <div>
            <button type="button" className={neutralButtonClass} onClick={() => goToStep("SHOW_QUESTION_ANSWER")}>
              Voir la réponse
              <ShortcutHint label="(Espace)" />
            </button>
          </div>
        </div>
      )}

      {step === "SHOW_QUESTION_ANSWER" && card.questions[currentQuestionIndex] && (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
          <p className="text-xs text-ink-muted">
            Question {currentQuestionIndex + 1} / {card.questions.length}
          </p>
          <p className="text-base text-ink-muted">{card.questions[currentQuestionIndex].prompt}</p>
          <p className="text-base font-medium">{card.questions[currentQuestionIndex].answerText}</p>
          <p className="text-sm text-ink-muted">Avez-vous répondu correctement ?</p>
          <div className="flex gap-3">
            <button type="button" className={successButtonClass} disabled={busy} onClick={() => handleQuestionOutcome("SUCCESS")}>
              Réussi
              <ShortcutHint label="(R)" />
            </button>
            <button type="button" className={failureButtonClass} disabled={busy} onClick={() => handleQuestionOutcome("FAILURE")}>
              Échoué
              <ShortcutHint label="(E)" />
            </button>
          </div>
        </div>
      )}

      {step === "SHOW_REVISION_SHEET" && card.questions[currentQuestionIndex]?.revisionSheet && (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Fiche de révision</p>
          <p className="whitespace-pre-wrap text-sm">{card.questions[currentQuestionIndex].revisionSheet.content}</p>
          <div>
            <button type="button" className={neutralButtonClass} onClick={advanceAfterQuestion}>
              Continuer
              <ShortcutHint label="(Espace)" />
            </button>
          </div>
        </div>
      )}

      {step === "SHOW_DEFINITION" && card.definitions[currentDefinitionIndex] && (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
          <p className="text-xs text-ink-muted">
            Définition {currentDefinitionIndex + 1} / {card.definitions.length}
          </p>
          <p className="text-base">{card.definitions[currentDefinitionIndex].term}</p>
          <div>
            <button type="button" className={neutralButtonClass} onClick={() => goToStep("SHOW_DEFINITION_ANSWER")}>
              Voir la définition
              <ShortcutHint label="(Espace)" />
            </button>
          </div>
        </div>
      )}

      {step === "SHOW_DEFINITION_ANSWER" && card.definitions[currentDefinitionIndex] && (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
          <p className="text-xs text-ink-muted">
            Définition {currentDefinitionIndex + 1} / {card.definitions.length}
          </p>
          <p className="text-base text-ink-muted">{card.definitions[currentDefinitionIndex].term}</p>
          <p className="text-base font-medium">{card.definitions[currentDefinitionIndex].expectedAnswer}</p>
          <p className="text-sm text-ink-muted">Avez-vous répondu correctement ?</p>
          <div className="flex gap-3">
            <button type="button" className={successButtonClass} disabled={busy} onClick={() => handleDefinitionOutcome("SUCCESS")}>
              Réussi
              <ShortcutHint label="(R)" />
            </button>
            <button type="button" className={failureButtonClass} disabled={busy} onClick={() => handleDefinitionOutcome("FAILURE")}>
              Échoué
              <ShortcutHint label="(E)" />
            </button>
          </div>
        </div>
      )}

      {step === "SHOW_EXERCISE" && selectedExercise && (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Exercice proposé</p>
          <p className="text-base font-medium">{selectedExercise.title}</p>
          {selectedExercise.description && <p className="text-sm text-ink-muted">{selectedExercise.description}</p>}
          <div className="flex gap-3 text-xs text-ink-muted">
            <span>{DIFFICULTY_LABELS[selectedExercise.difficulty]}</span>
            {selectedExercise.reference && <span>Réf. {selectedExercise.reference}</span>}
          </div>
          <div>
            <button type="button" className={neutralButtonClass} onClick={() => goToStep("CARD_SUMMARY")}>
              Continuer
              <ShortcutHint label="(Espace)" />
            </button>
          </div>
        </div>
      )}

      {step === "CARD_SUMMARY" && (
        <CardSummaryStep
          questionResults={questionResults}
          definitionResults={definitionResults}
          busy={busy}
          onVerdict={handleVerdict}
        />
      )}
    </div>
  );
}

function CardSummaryStep({
  questionResults,
  definitionResults,
  busy,
  onVerdict,
}: {
  questionResults: ReviewOutcome[];
  definitionResults: ReviewOutcome[];
  busy: boolean;
  onVerdict: (outcome: ReviewOutcome) => void;
}) {
  const summary = summarizeCardResults(questionResults, definitionResults);
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Résumé</p>
      <p className="text-sm">
        Questions : {summary.questionsSucceeded} / {summary.questionsTotal} réussies
      </p>
      {summary.definitionsTotal > 0 && (
        <p className="text-sm">
          Définitions : {summary.definitionsSucceeded} / {summary.definitionsTotal} réussies
        </p>
      )}
      <p className="mt-2 text-sm font-medium">Avez-vous maîtrisé cette fiche ?</p>
      <p className="text-xs text-ink-muted">
        Ce n'est pas un calcul automatique : c'est votre décision, elle détermine le prochain palier de révision.
      </p>
      <div className="flex gap-3">
        <button type="button" className={successButtonClass} disabled={busy} onClick={() => onVerdict("SUCCESS")}>
          Oui, maîtrisée
          <ShortcutHint label="(O)" />
        </button>
        <button type="button" className={failureButtonClass} disabled={busy} onClick={() => onVerdict("FAILURE")}>
          Non, pas encore
          <ShortcutHint label="(N)" />
        </button>
      </div>
    </div>
  );
}
