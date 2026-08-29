import type { Card } from "../entities/Card";
import type { NewCardAggregate } from "../entities/NewCardAggregate";
import type { CardId, CourseId, TagId } from "../value-objects/Ids";
import type { LocalDate } from "../value-objects/LocalDate";
import type { DueStatus } from "../value-objects/DueStatus";
import type { ReviewLevel } from "../value-objects/ReviewLevel";

/** Read-model léger pour la Bibliothèque/le Dashboard — jamais l'agrégat complet (CQRS léger, voir section 1). */
export interface CardSummary {
  id: CardId;
  title: string;
  courseId: CourseId | null;
  currentLevel: number;
  nextReviewDate: LocalDate;
  dueStatus: DueStatus;
  successCount: number;
  lastReviewDate: LocalDate | null;
  tagIds: TagId[];
}

export interface LibraryFilter {
  searchText?: string;
  courseId?: CourseId;
  /** Une fiche correspond si elle porte AU MOINS UN des tags listés. */
  tagIds?: TagId[];
  dueStatus?: DueStatus;
  includeArchived?: boolean;
}

export type LibrarySortField = "nextReviewDate" | "title" | "currentLevel";
export type LibrarySortDirection = "asc" | "desc";

export interface LibrarySort {
  field: LibrarySortField;
  direction: LibrarySortDirection;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

/**
 * Entrée d'édition manuelle d'une fiche existante (retour utilisateur, voir conversation) —
 * mêmes champs que NewCardAggregate (les questions/définitions sont réécrites en bloc,
 * pas diffées une par une) plus `currentLevel`, éditable manuellement pour corriger une
 * planification erronée. Éditer le niveau ne modifie PAS nextReviewDate : seule une vraie
 * révision (CompleteCardReviewUseCase) replanifie la fiche.
 */
export interface CardEditInput extends NewCardAggregate {
  currentLevel: ReviewLevel;
}

/**
 * Port du repository de fiches. Aucune implémentation concrète ici — voir
 * infrastructure/database/repositories/DrizzleCardRepository.ts pour l'adaptateur SQLite.
 */
export interface CardRepository {
  findDueToday(today: LocalDate): Promise<Card[]>;
  findById(id: CardId): Promise<Card | null>;
  /** `sort` par défaut : nextReviewDate croissant (fiches les plus urgentes en premier). */
  findSummaries(filter: LibraryFilter, page: Pagination, sort?: LibrarySort): Promise<PagedResult<CardSummary>>;
  save(card: Card): Promise<void>;
  createWithChildren(card: NewCardAggregate): Promise<CardId>;
  /** Réécrit titre/cours/notes/niveau et l'ensemble des questions/définitions/exercices/tags d'une fiche existante. */
  updateWithChildren(id: CardId, input: CardEditInput): Promise<void>;
  archive(id: CardId): Promise<void>;
  /** Remet une fiche archivée en activité — ne touche pas nextReviewDate (voir retour utilisateur). */
  unarchive(id: CardId): Promise<void>;
  /** Suppression physique définitive — action explicite hors flux normal (voir section 4). */
  delete(id: CardId): Promise<void>;
  countActive(): Promise<number>;
  countAll(): Promise<number>;
  /** Lecture agrégée légère pour le Dashboard (évite d'hydrater tous les agrégats Card complets). */
  getProgressSnapshot(): Promise<{ activeCount: number; averageLevelRatio: number }>;
}
