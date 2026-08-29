import type { LocalDate } from "./LocalDate";

/**
 * DueStatus — statut d'affichage d'une fiche, TOUJOURS calculé à la volée depuis
 * currentLevel / nextReviewDate / isArchived, jamais stocké en base (voir section 8
 * du document d'architecture : "statut de fiche calculé, pas stocké").
 */
export type DueStatus = "ARCHIVED" | "OVERDUE" | "DUE_TODAY" | "SCHEDULED";

export function computeDueStatus(input: {
  isArchived: boolean;
  nextReviewDate: LocalDate;
  today: LocalDate;
}): DueStatus {
  if (input.isArchived) return "ARCHIVED";
  if (input.nextReviewDate.isBefore(input.today)) return "OVERDUE";
  if (input.nextReviewDate.equals(input.today)) return "DUE_TODAY";
  return "SCHEDULED";
}
