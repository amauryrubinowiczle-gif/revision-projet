// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setContainer, type Container } from "@infrastructure/di/container";
import { CardReviewFlow } from "@ui/pages/ReviewSession/CardReviewFlow";
import { asCardId, asQuestionId, asRevisionSheetId, asReviewSessionId } from "@domain/value-objects/Ids";
import type { CourseRepository } from "@domain/ports/CourseRepository";
import type { TagRepository } from "@domain/ports/TagRepository";
import type { AIService } from "@domain/ports/AIService";
import { FakeCardRepository, FakeClock, FakeExerciseRepository, FakeReviewHistoryRepository, FakeStatisticsRepository, makeTestCard } from "../application/fakes";
import { LocalDate } from "@domain/value-objects/LocalDate";

/**
 * Vérifie le flux clavier de CardReviewFlow (Phase 7 : raccourcis clavier) — et, en même
 * temps, ré-exerce la logique de branchement "fiche de révision affichée après un échec"
 * (Phase 5), cette fois via un vrai rendu React plutôt qu'un script ad hoc contre la DB.
 */

function unusedCourseRepository(): CourseRepository {
  return {
    findAll: async () => [],
    create: async () => {
      throw new Error("not used in this test");
    },
  };
}

function unusedTagRepository(): TagRepository {
  return {
    findAll: async () => [],
    create: async () => {
      throw new Error("not used in this test");
    },
  };
}

function unusedAIService(): AIService {
  return {
    generateCards: async () => {
      throw new Error("not used in this test");
    },
    verifyAnswer: async () => {
      throw new Error("not used in this test");
    },
    generateRevisionSheet: async () => {
      throw new Error("not used in this test");
    },
    generateExercises: async () => {
      throw new Error("not used in this test");
    },
    summarizeCourse: async () => {
      throw new Error("not used in this test");
    },
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("CardReviewFlow — raccourcis clavier", () => {
  let cardRepository: FakeCardRepository;

  beforeEach(() => {
    cardRepository = new FakeCardRepository();
    const container: Container = {
      cardRepository,
      reviewHistoryRepository: new FakeReviewHistoryRepository(),
      exerciseRepository: new FakeExerciseRepository(),
      courseRepository: unusedCourseRepository(),
      tagRepository: unusedTagRepository(),
      statisticsRepository: new FakeStatisticsRepository(),
      clock: new FakeClock(LocalDate.fromISODate("2026-08-29")),
      aiService: unusedAIService(),
    };
    setContainer(container);
  });

  it("Espace révèle la réponse, Échec (E) affiche la fiche de révision, Espace continue, puis O valide le verdict", async () => {
    const user = userEvent.setup();
    const questionId = asQuestionId("q-1");
    const card = makeTestCard({
      id: asCardId("card-1"),
      questions: [
        {
          id: questionId,
          cardId: asCardId("card-1"),
          order: 0,
          prompt: "Dérivée de x² ?",
          answerText: "2x",
          revisionSheet: {
            id: asRevisionSheetId("sheet-1"),
            questionId,
            content: "Règle : d/dx(x^n) = n*x^(n-1)",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      definitions: [],
    });
    cardRepository.seed(card);

    const onDone = vi.fn();
    renderWithProviders(<CardReviewFlow sessionId={asReviewSessionId("session-1")} card={card} availableExercises={[]} onDone={onDone} />);

    // Préparation (StartCardReviewUseCase asynchrone) puis question affichée.
    expect(await screen.findByText("Dérivée de x² ?")).toBeInTheDocument();
    expect(screen.queryByText("2x")).not.toBeInTheDocument();

    await user.keyboard(" ");
    expect(await screen.findByText("2x")).toBeInTheDocument();

    await user.keyboard("e");
    expect(await screen.findByText("Règle : d/dx(x^n) = n*x^(n-1)")).toBeInTheDocument();

    await user.keyboard(" ");
    expect(await screen.findByText("Avez-vous maîtrisé cette fiche ?")).toBeInTheDocument();
    expect(screen.getByText(/Questions : 0 \/ 1 réussies/)).toBeInTheDocument();

    await user.keyboard("o");
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
