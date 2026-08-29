import type { LocalDate } from "../value-objects/LocalDate";
import type { ReviewLevel } from "../value-objects/ReviewLevel";

export interface StatisticsSnapshot {
  averageDailyReviewSeconds: number;
  consecutiveReviewDays: number;
  /** Taux de réussite sur les CardReviewEvent complétés (completed = true), en [0,1]. */
  successRate: number;
  /** Fiches actuellement au niveau maximum (7) — proxy de "terminée/maîtrisée". */
  masteredCardsCount: number;
  /** Fiches dont le dernier événement complété est un échec. */
  strugglingCardsCount: number;
}

export interface DailyActivity {
  date: LocalDate;
  successCount: number;
  failureCount: number;
}

/**
 * Port dédié aux agrégations statistiques — séparé de ReviewHistoryRepository pour ne
 * pas alourdir le port d'écriture incrémentale avec des requêtes de lecture complexes
 * (CQRS léger, voir section 1 du document d'architecture).
 */
export interface StatisticsRepository {
  getSnapshot(today: LocalDate): Promise<StatisticsSnapshot>;
  /** Une entrée par jour, du plus ancien au plus récent, `today` inclus — jours sans activité à 0/0. */
  getDailyActivity(today: LocalDate, days: number): Promise<DailyActivity[]>;
  /** Nombre de fiches actives par niveau (1-7) — les niveaux sans fiche valent 0. */
  getLevelDistribution(): Promise<Record<ReviewLevel, number>>;
}
