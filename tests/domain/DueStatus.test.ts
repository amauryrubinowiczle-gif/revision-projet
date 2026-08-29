import { describe, expect, it } from "vitest";
import { computeDueStatus } from "@domain/value-objects/DueStatus";
import { LocalDate } from "@domain/value-objects/LocalDate";

const today = LocalDate.fromISODate("2026-08-28");

describe("computeDueStatus — statut calculé, jamais stocké", () => {
  it("ARCHIVED prime sur toute autre condition", () => {
    expect(computeDueStatus({ isArchived: true, nextReviewDate: today, today })).toBe("ARCHIVED");
  });

  it("OVERDUE quand la date de révision est passée", () => {
    expect(computeDueStatus({ isArchived: false, nextReviewDate: today.plusDays(-2), today })).toBe("OVERDUE");
  });

  it("DUE_TODAY quand la date de révision est aujourd'hui", () => {
    expect(computeDueStatus({ isArchived: false, nextReviewDate: today, today })).toBe("DUE_TODAY");
  });

  it("SCHEDULED quand la date de révision est dans le futur", () => {
    expect(computeDueStatus({ isArchived: false, nextReviewDate: today.plusDays(3), today })).toBe("SCHEDULED");
  });
});
