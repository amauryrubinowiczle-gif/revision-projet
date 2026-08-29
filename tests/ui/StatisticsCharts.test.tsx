// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyActivityChart } from "@ui/pages/Statistics/DailyActivityChart";
import { LevelDistributionChart } from "@ui/pages/Statistics/LevelDistributionChart";
import { LocalDate } from "@domain/value-objects/LocalDate";

describe("DailyActivityChart", () => {
  it("affiche la légende et un jour sans planter sur un jeu de données vide", () => {
    render(<DailyActivityChart activity={[]} />);
    expect(screen.getByText("Réussi")).toBeInTheDocument();
    expect(screen.getByText("Échoué")).toBeInTheDocument();
  });

  it("affiche une info-bulle par jour avec le détail succès/échec", () => {
    const { container } = render(
      <DailyActivityChart
        activity={[
          { date: LocalDate.fromISODate("2026-08-29"), successCount: 2, failureCount: 1 },
          { date: LocalDate.fromISODate("2026-08-28"), successCount: 0, failureCount: 0 },
        ]}
      />,
    );
    const titles = [...container.querySelectorAll("title")].map((t) => t.textContent);
    expect(titles).toContain("2026-08-29 — 2 réussie(s), 1 échouée(s)");
    // Jour sans événement : pas d'info-bulle inutile.
    expect(titles.some((t) => t?.includes("2026-08-28"))).toBe(false);
  });
});

describe("LevelDistributionChart", () => {
  it("affiche les 7 niveaux même sans aucune fiche", () => {
    const { container } = render(
      <LevelDistributionChart distribution={{ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }} />,
    );
    const titles = [...container.querySelectorAll("title")].map((t) => t.textContent);
    expect(titles).toEqual([
      "Niveau 1 : 0 fiche(s)",
      "Niveau 2 : 0 fiche(s)",
      "Niveau 3 : 0 fiche(s)",
      "Niveau 4 : 0 fiche(s)",
      "Niveau 5 : 0 fiche(s)",
      "Niveau 6 : 0 fiche(s)",
      "Niveau 7 : 0 fiche(s)",
    ]);
  });

  it("affiche le compte au-dessus des barres non vides uniquement", () => {
    const { container } = render(<LevelDistributionChart distribution={{ 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1 }} />);
    const counts = [...container.querySelectorAll("text.tabular-nums")].map((t) => t.textContent);
    expect(counts).toEqual(["3", "1"]);
  });
});
