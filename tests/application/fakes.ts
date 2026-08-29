import type { Card } from "@domain/entities/Card";
import type { Question } from "@domain/entities/Question";
import type { Definition } from "@domain/entities/Definition";
import type { CardEditInput, CardRepository, CardSummary, LibraryFilter, LibrarySort, PagedResult, Pagination } from "@domain/ports/CardRepository";
import { computeDueStatus } from "@domain/value-objects/DueStatus";
import type {
  FinalizeCardReviewInput,
  RecordDefinitionResultInput,
  RecordQuestionResultInput,
  ReviewHistoryRepository,
} from "@domain/ports/ReviewHistoryRepository";
import type { Clock } from "@domain/ports/Clock";
import type { ExerciseRepository } from "@domain/ports/ExerciseRepository";
import type { Exercise } from "@domain/entities/Exercise";
import type { NewCardAggregate } from "@domain/entities/NewCardAggregate";
import {
  asCardId,
  asCardReviewEventId,
  asDefinitionId,
  asQuestionId,
  asReviewSessionId,
  asRevisionSheetId,
  type CardId,
  type CardReviewEventId,
  type ExerciseId,
  type ReviewSessionId,
} from "@domain/value-objects/Ids";
import { LocalDate } from "@domain/value-objects/LocalDate";
import type { ReviewLevel } from "@domain/value-objects/ReviewLevel";
import type { DailyActivity, StatisticsRepository, StatisticsSnapshot } from "@domain/ports/StatisticsRepository";

/**
 * Repositories "fakes" en mémoire — utilisés par les tests de la couche application
 * (voir section 2 : "cas d'usage testés avec repositories fakes, sans DB réelle").
 * PAS des mocks (pas d'assertions sur les appels) : de vraies implémentations minimales
 * du port, en mémoire, qui se comportent comme la vraie chose du point de vue du use case.
 */
export class FakeClock implements Clock {
  constructor(private fixedToday: LocalDate) {}
  today(): LocalDate {
    return this.fixedToday;
  }
  now(): Date {
    return new Date(`${this.fixedToday.toISODate()}T12:00:00.000Z`);
  }
}

export class FakeCardRepository implements CardRepository {
  private cards = new Map<string, Card>();
  private idCounter = 0;

  seed(card: Card): void {
    this.cards.set(card.id, card);
  }

  async findDueToday(today: LocalDate): Promise<Card[]> {
    return [...this.cards.values()].filter((c) => !c.isArchived && c.nextReviewDate.isSameOrBefore(today));
  }
  async findById(id: CardId): Promise<Card | null> {
    return this.cards.get(id) ?? null;
  }
  async findSummaries(filter: LibraryFilter, page: Pagination, sort?: LibrarySort): Promise<PagedResult<CardSummary>> {
    const today = LocalDate.fromUTCDate(new Date());
    let cards = [...this.cards.values()];

    if (filter.dueStatus === "ARCHIVED") {
      cards = cards.filter((c) => c.isArchived);
    } else {
      if (!filter.includeArchived) cards = cards.filter((c) => !c.isArchived);
      if (filter.dueStatus === "OVERDUE") cards = cards.filter((c) => c.nextReviewDate.isBefore(today));
      else if (filter.dueStatus === "DUE_TODAY") cards = cards.filter((c) => c.nextReviewDate.equals(today));
      else if (filter.dueStatus === "SCHEDULED") cards = cards.filter((c) => today.isBefore(c.nextReviewDate));
    }
    if (filter.courseId) cards = cards.filter((c) => c.courseId === filter.courseId);
    if (filter.searchText) {
      const needle = filter.searchText.toLowerCase();
      cards = cards.filter((c) => c.title.toLowerCase().includes(needle) || (c.notes?.toLowerCase().includes(needle) ?? false));
    }
    if (filter.tagIds && filter.tagIds.length > 0) {
      const wanted = new Set<string>(filter.tagIds);
      cards = cards.filter((c) => c.tagIds.some((t) => wanted.has(t)));
    }

    const field = sort?.field ?? "nextReviewDate";
    const direction = sort?.direction ?? "asc";
    cards = [...cards].sort((a, b) => {
      let cmp = 0;
      if (field === "title") cmp = a.title.localeCompare(b.title);
      else if (field === "currentLevel") cmp = a.currentLevel - b.currentLevel;
      else cmp = a.nextReviewDate.toISODate().localeCompare(b.nextReviewDate.toISODate());
      return direction === "desc" ? -cmp : cmp;
    });

    const total = cards.length;
    const start = (page.page - 1) * page.pageSize;
    const items: CardSummary[] = cards.slice(start, start + page.pageSize).map((c) => ({
      id: c.id,
      title: c.title,
      courseId: c.courseId,
      currentLevel: c.currentLevel,
      nextReviewDate: c.nextReviewDate,
      dueStatus: computeDueStatus({ isArchived: c.isArchived, nextReviewDate: c.nextReviewDate, today }),
      // Pas de ReviewHistoryRepository accessible depuis ce fake — non exercé par ces tests.
      successCount: 0,
      lastReviewDate: c.lastReviewDate,
      tagIds: c.tagIds,
    }));

    return { items, total };
  }
  async save(card: Card): Promise<void> {
    this.cards.set(card.id, card);
  }
  async createWithChildren(_card: NewCardAggregate): Promise<CardId> {
    throw new Error("not used in these tests");
  }
  async updateWithChildren(id: CardId, input: CardEditInput): Promise<void> {
    const existing = this.cards.get(id);
    if (!existing) throw new Error("card not found");

    const newQuestionIds = input.questions.map(() => asQuestionId(`q-${this.idCounter++}`));
    const questions: Question[] = input.questions.map((q, index) => ({
      id: newQuestionIds[index]!,
      cardId: id,
      order: index,
      prompt: q.prompt,
      answerText: q.answerText,
      revisionSheet: q.revisionSheetContent
        ? {
            id: asRevisionSheetId(`sheet-${this.idCounter++}`),
            questionId: newQuestionIds[index]!,
            content: q.revisionSheetContent,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const definitions: Definition[] = input.definitions.map((d, index) => ({
      id: asDefinitionId(`d-${this.idCounter++}`),
      cardId: id,
      term: d.term,
      expectedAnswer: d.expectedAnswer,
      order: index,
      linkedQuestionId: d.linkedQuestionIndex !== null ? (newQuestionIds[d.linkedQuestionIndex] ?? null) : null,
    }));

    this.cards.set(id, {
      ...existing,
      title: input.title,
      courseId: input.courseId,
      notes: input.notes,
      currentLevel: input.currentLevel,
      questions,
      definitions,
      exerciseRefs: input.exerciseIds.map((exerciseId, order) => ({ exerciseId, order })),
      tagIds: input.tagIds,
      updatedAt: new Date(),
    });
  }
  async archive(id: CardId): Promise<void> {
    const card = this.cards.get(id);
    if (card) this.cards.set(id, { ...card, isArchived: true });
  }
  async unarchive(id: CardId): Promise<void> {
    const card = this.cards.get(id);
    if (card) this.cards.set(id, { ...card, isArchived: false });
  }
  async delete(id: CardId): Promise<void> {
    this.cards.delete(id);
  }
  async countActive(): Promise<number> {
    return [...this.cards.values()].filter((c) => !c.isArchived).length;
  }
  async countAll(): Promise<number> {
    return this.cards.size;
  }
  async getProgressSnapshot(): Promise<{ activeCount: number; averageLevelRatio: number }> {
    const active = [...this.cards.values()].filter((c) => !c.isArchived);
    if (active.length === 0) return { activeCount: 0, averageLevelRatio: 0 };
    return { activeCount: active.length, averageLevelRatio: active.reduce((s, c) => s + c.currentLevel / 7, 0) / active.length };
  }
}

export class FakeReviewHistoryRepository implements ReviewHistoryRepository {
  public finalizedEvents: FinalizeCardReviewInput[] = [];
  public questionResults: RecordQuestionResultInput[] = [];
  public definitionResults: RecordDefinitionResultInput[] = [];
  public endedSessions: { sessionId: string; cardsCompleted: number }[] = [];

  private eventCounter = 0;

  async createSession(_input: { startedAt: Date; cardsPlanned: number }): Promise<ReviewSessionId> {
    return asReviewSessionId("session-1");
  }
  async createCardReviewEvent(_input: { sessionId: ReviewSessionId; cardId: CardId; levelBefore: ReviewLevel }): Promise<CardReviewEventId> {
    this.eventCounter += 1;
    return asCardReviewEventId(`event-${this.eventCounter}`);
  }
  async recordQuestionResult(input: RecordQuestionResultInput): Promise<void> {
    this.questionResults.push(input);
  }
  async recordDefinitionResult(input: RecordDefinitionResultInput): Promise<void> {
    this.definitionResults.push(input);
  }
  async finalizeCardReview(input: FinalizeCardReviewInput): Promise<void> {
    this.finalizedEvents.push(input);
  }
  async endSession(sessionId: ReviewSessionId, cardsCompleted: number): Promise<void> {
    this.endedSessions.push({ sessionId, cardsCompleted });
  }
}

export class FakeExerciseRepository implements ExerciseRepository {
  private exercises = new Map<string, Exercise>();
  seed(exercise: Exercise): void {
    this.exercises.set(exercise.id, exercise);
  }
  async findByIds(ids: ExerciseId[]): Promise<Exercise[]> {
    return ids.map((id) => this.exercises.get(id)).filter((e): e is Exercise => !!e);
  }
  async findAll(): Promise<Exercise[]> {
    return [...this.exercises.values()];
  }
  async create(): Promise<ExerciseId> {
    throw new Error("not used in these tests");
  }
}

/** Fake configurable par les tests plutôt que "réelle" — les agrégations vivent dans DrizzleStatisticsRepository, testées via le spike d'intégration (voir HANDOFF.md). */
export class FakeStatisticsRepository implements StatisticsRepository {
  public snapshot: StatisticsSnapshot = {
    averageDailyReviewSeconds: 0,
    consecutiveReviewDays: 0,
    successRate: 0,
    masteredCardsCount: 0,
    strugglingCardsCount: 0,
  };
  public dailyActivity: DailyActivity[] = [];
  public levelDistribution: Record<ReviewLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  async getSnapshot(): Promise<StatisticsSnapshot> {
    return this.snapshot;
  }
  async getDailyActivity(): Promise<DailyActivity[]> {
    return this.dailyActivity;
  }
  async getLevelDistribution(): Promise<Record<ReviewLevel, number>> {
    return this.levelDistribution;
  }
}

export function makeTestCard(overrides: Partial<Card> = {}): Card {
  return {
    id: asCardId("card-1"),
    title: "Dérivées usuelles",
    courseId: null,
    currentLevel: 1,
    nextReviewDate: LocalDate.fromISODate("2026-08-28"),
    lastReviewDate: null,
    isArchived: false,
    notes: null,
    questions: [],
    definitions: [],
    exerciseRefs: [],
    tagIds: [],
    comments: [],
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  };
}
