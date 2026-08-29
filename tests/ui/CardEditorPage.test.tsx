// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setContainer, type Container } from "@infrastructure/di/container";
import { CardEditorPage } from "@ui/pages/CardEditor/CardEditorPage";
import { asCardId, asQuestionId, asRevisionSheetId } from "@domain/value-objects/Ids";
import type { CourseRepository } from "@domain/ports/CourseRepository";
import type { TagRepository } from "@domain/ports/TagRepository";
import type { ExerciseRepository } from "@domain/ports/ExerciseRepository";
import type { AIService } from "@domain/ports/AIService";
import { FakeCardRepository, FakeClock, FakeReviewHistoryRepository, FakeStatisticsRepository, makeTestCard } from "../application/fakes";
import { LocalDate } from "@domain/value-objects/LocalDate";

function noopRepo<T extends object>(methods: T): T {
  return methods;
}

function renderEditPage(cardId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/card/${cardId}/edit`]}>
        <Routes>
          <Route path="/card/:id/edit" element={<CardEditorPage />} />
          <Route path="/library" element={<div>ÉCRAN BIBLIOTHÈQUE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CardEditorPage — mode édition", () => {
  let cardRepository: FakeCardRepository;

  beforeEach(() => {
    cardRepository = new FakeCardRepository();
    const container: Container = {
      cardRepository,
      reviewHistoryRepository: new FakeReviewHistoryRepository(),
      exerciseRepository: noopRepo<ExerciseRepository>({
        findByIds: async () => [],
        findAll: async () => [],
        create: async () => {
          throw new Error("not used");
        },
      }),
      courseRepository: noopRepo<CourseRepository>({
        findAll: async () => [],
        create: async () => {
          throw new Error("not used");
        },
      }),
      tagRepository: noopRepo<TagRepository>({
        findAll: async () => [],
        create: async () => {
          throw new Error("not used");
        },
      }),
      statisticsRepository: new FakeStatisticsRepository(),
      clock: new FakeClock(LocalDate.fromISODate("2026-08-29")),
      aiService: noopRepo<AIService>({
        generateCards: async () => {
          throw new Error("not used");
        },
        verifyAnswer: async () => {
          throw new Error("not used");
        },
        generateRevisionSheet: async () => {
          throw new Error("not used");
        },
        generateExercises: async () => {
          throw new Error("not used");
        },
        summarizeCourse: async () => {
          throw new Error("not used");
        },
      }),
    };
    setContainer(container);
  });

  it("pré-remplit le formulaire avec la fiche existante et enregistre les modifications", async () => {
    const user = userEvent.setup();
    const cardId = asCardId("card-1");
    const questionId = asQuestionId("q-1");
    cardRepository.seed(
      makeTestCard({
        id: cardId,
        title: "Ancien titre",
        currentLevel: 2,
        questions: [
          {
            id: questionId,
            cardId,
            order: 0,
            prompt: "Ancienne question ?",
            answerText: "Ancienne réponse",
            revisionSheet: {
              id: asRevisionSheetId("sheet-1"),
              questionId,
              content: "Ancienne fiche",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        definitions: [],
      }),
    );

    renderEditPage(cardId);

    const titleInput = await screen.findByDisplayValue("Ancien titre");
    expect(await screen.findByDisplayValue("Ancienne question ?")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Niveau 2/7")).toBeInTheDocument();

    await user.clear(titleInput);
    await user.type(titleInput, "Nouveau titre");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("ÉCRAN BIBLIOTHÈQUE")).toBeInTheDocument();
    const updated = await cardRepository.findById(cardId);
    expect(updated?.title).toBe("Nouveau titre");
    expect(updated?.currentLevel).toBe(2);
  });

  it("affiche un message si la fiche à éditer n'existe pas", async () => {
    renderEditPage("id-inexistant");
    await waitFor(() => expect(screen.getByText("Cette fiche est introuvable.")).toBeInTheDocument());
  });
});
