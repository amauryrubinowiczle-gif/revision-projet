import { describe, expect, it } from "vitest";
import { GetLibraryUseCase } from "@application/card/GetLibraryUseCase";
import { LocalDate } from "@domain/value-objects/LocalDate";
import { asCardId, asCourseId, asTagId } from "@domain/value-objects/Ids";
import { FakeCardRepository, makeTestCard } from "./fakes";

const TODAY = LocalDate.fromUTCDate(new Date());

describe("GetLibraryUseCase", () => {
  it("exclut les fiches archivées par défaut", async () => {
    const cardRepository = new FakeCardRepository();
    cardRepository.seed(makeTestCard({ id: asCardId("active"), isArchived: false }));
    cardRepository.seed(makeTestCard({ id: asCardId("archived"), isArchived: true }));

    const result = await new GetLibraryUseCase(cardRepository).execute({}, { page: 1, pageSize: 50 });

    expect(result.items.map((i) => i.id)).toEqual(["active"]);
  });

  it("filtre par statut d'échéance (OVERDUE/DUE_TODAY/SCHEDULED/ARCHIVED)", async () => {
    const cardRepository = new FakeCardRepository();
    cardRepository.seed(makeTestCard({ id: asCardId("overdue"), nextReviewDate: TODAY.plusDays(-3) }));
    cardRepository.seed(makeTestCard({ id: asCardId("today"), nextReviewDate: TODAY }));
    cardRepository.seed(makeTestCard({ id: asCardId("scheduled"), nextReviewDate: TODAY.plusDays(5) }));
    cardRepository.seed(makeTestCard({ id: asCardId("archived"), isArchived: true }));

    const useCase = new GetLibraryUseCase(cardRepository);
    const page = { page: 1, pageSize: 50 };

    expect((await useCase.execute({ dueStatus: "OVERDUE" }, page)).items.map((i) => i.id)).toEqual(["overdue"]);
    expect((await useCase.execute({ dueStatus: "DUE_TODAY" }, page)).items.map((i) => i.id)).toEqual(["today"]);
    expect((await useCase.execute({ dueStatus: "SCHEDULED" }, page)).items.map((i) => i.id)).toEqual(["scheduled"]);
    expect((await useCase.execute({ dueStatus: "ARCHIVED" }, page)).items.map((i) => i.id)).toEqual(["archived"]);
  });

  it("filtre par cours et par recherche texte (titre ou commentaire)", async () => {
    const cardRepository = new FakeCardRepository();
    const mathCourse = asCourseId("math");
    cardRepository.seed(makeTestCard({ id: asCardId("a"), title: "Dérivées", courseId: mathCourse }));
    cardRepository.seed(makeTestCard({ id: asCardId("b"), title: "Intégrales", courseId: mathCourse, notes: "à revoir : dérivées composées" }));
    cardRepository.seed(makeTestCard({ id: asCardId("c"), title: "Photosynthèse", courseId: asCourseId("bio") }));

    const useCase = new GetLibraryUseCase(cardRepository);
    const page = { page: 1, pageSize: 50 };

    expect((await useCase.execute({ courseId: mathCourse }, page)).items.map((i) => i.id).sort()).toEqual(["a", "b"]);
    expect((await useCase.execute({ searchText: "dérivées" }, page)).items.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("filtre par tag (correspond si la fiche porte au moins un des tags demandés)", async () => {
    const cardRepository = new FakeCardRepository();
    const algebra = asTagId("algebra");
    const geometry = asTagId("geometry");
    cardRepository.seed(makeTestCard({ id: asCardId("a"), tagIds: [algebra] }));
    cardRepository.seed(makeTestCard({ id: asCardId("b"), tagIds: [geometry] }));
    cardRepository.seed(makeTestCard({ id: asCardId("c"), tagIds: [] }));

    const result = await new GetLibraryUseCase(cardRepository).execute({ tagIds: [algebra, geometry] }, { page: 1, pageSize: 50 });

    expect(result.items.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("trie par titre, niveau ou prochaine révision, croissant ou décroissant", async () => {
    const cardRepository = new FakeCardRepository();
    cardRepository.seed(makeTestCard({ id: asCardId("b"), title: "Bravo", currentLevel: 2, nextReviewDate: TODAY.plusDays(2) }));
    cardRepository.seed(makeTestCard({ id: asCardId("a"), title: "Alpha", currentLevel: 5, nextReviewDate: TODAY.plusDays(1) }));

    const useCase = new GetLibraryUseCase(cardRepository);
    const page = { page: 1, pageSize: 50 };

    expect((await useCase.execute({}, page, { field: "title", direction: "asc" })).items.map((i) => i.id)).toEqual(["a", "b"]);
    expect((await useCase.execute({}, page, { field: "currentLevel", direction: "desc" })).items.map((i) => i.id)).toEqual(["a", "b"]);
    expect((await useCase.execute({}, page, { field: "nextReviewDate", direction: "asc" })).items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("pagine et renvoie le total sur l'ensemble filtré, pas seulement la page courante", async () => {
    const cardRepository = new FakeCardRepository();
    for (let i = 0; i < 5; i += 1) {
      cardRepository.seed(makeTestCard({ id: asCardId(`card-${i}`), title: `Fiche ${i}` }));
    }

    const result = await new GetLibraryUseCase(cardRepository).execute({}, { page: 2, pageSize: 2 }, { field: "title", direction: "asc" });

    expect(result.total).toBe(5);
    expect(result.items.map((i) => i.id)).toEqual(["card-2", "card-3"]);
  });
});
