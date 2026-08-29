import { describe, expect, it } from "vitest";
import { LocalDate } from "@domain/value-objects/LocalDate";

describe("LocalDate", () => {
  it("parse et sérialise au format ISO YYYY-MM-DD", () => {
    const d = LocalDate.fromISODate("2026-08-28");
    expect(d.toISODate()).toBe("2026-08-28");
  });

  it("rejette un format invalide", () => {
    expect(() => LocalDate.fromISODate("28/08/2026")).toThrow();
  });

  it("plusDays avance correctement, y compris à cheval sur un changement de mois", () => {
    const d = LocalDate.fromISODate("2026-01-30");
    expect(d.plusDays(3).toISODate()).toBe("2026-02-02");
  });

  it("plusDays gère le passage d'année", () => {
    const d = LocalDate.fromISODate("2026-12-30");
    expect(d.plusDays(3).toISODate()).toBe("2027-01-02");
  });

  it("plusDays gère une année bissextile (29 février)", () => {
    const d = LocalDate.fromISODate("2028-02-28");
    expect(d.plusDays(1).toISODate()).toBe("2028-02-29");
  });

  it("n'est pas affectée par un changement d'heure été/hiver (arithmétique en UTC pur)", () => {
    // 2026-10-25 est la nuit du changement d'heure été->hiver en Europe.
    const d = LocalDate.fromISODate("2026-10-24");
    expect(d.plusDays(1).toISODate()).toBe("2026-10-25");
    expect(d.plusDays(2).toISODate()).toBe("2026-10-26");
  });

  it("isBefore / isAfter / equals sont cohérents", () => {
    const a = LocalDate.fromISODate("2026-08-28");
    const b = LocalDate.fromISODate("2026-08-29");
    expect(a.isBefore(b)).toBe(true);
    expect(b.isAfter(a)).toBe(true);
    expect(a.equals(LocalDate.fromISODate("2026-08-28"))).toBe(true);
  });

  it("daysUntil calcule un écart signé en jours entiers", () => {
    const a = LocalDate.fromISODate("2026-08-28");
    const b = LocalDate.fromISODate("2026-09-02");
    expect(a.daysUntil(b)).toBe(5);
    expect(b.daysUntil(a)).toBe(-5);
  });
});
