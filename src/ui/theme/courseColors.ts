import type { CSSProperties } from "react";

/**
 * Couleurs de cours (facultatives) — voir globals.css pour la justification du choix
 * (seules deux teintes passent la vérification CVD/contraste face aux couleurs déjà
 * réservées de l'app, accent/success/danger, à cette luminosité). Un cours sans couleur
 * reste neutre — ce n'est pas un défaut, juste une option de mise en valeur.
 */
export interface CourseColorOption {
  value: string;
  label: string;
  swatchClass: string;
}

export const COURSE_COLOR_OPTIONS: CourseColorOption[] = [
  { value: "#c964d8", label: "Magenta", swatchClass: "bg-course-a" },
  { value: "#dcac3f", label: "Or", swatchClass: "bg-course-b" },
];

export function courseDotStyle(color: string | null | undefined): CSSProperties | undefined {
  return color ? { backgroundColor: color } : undefined;
}
