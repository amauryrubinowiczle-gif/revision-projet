/**
 * LocalDate — une date calendaire pure (année/mois/jour), sans heure ni fuseau.
 *
 * Pourquoi ce type existe : le brief fixe des paliers de révision en NOMBRE DE JOURS
 * (1,2,3...7). Manipuler des `Date` avec heure (et donc un fuseau horaire implicite)
 * pour ce genre de calcul est une source classique de bugs (une révision faite à 23h50
 * puis recalculée après minuit, changement d'heure été/hiver, utilisateur qui voyage...).
 * En confinant tout calcul de répétition espacée à ce type, on élimine la classe entière
 * de bugs liés à l'heure — voir risque technique n°4 du document d'architecture.
 *
 * Toute l'arithmétique interne est faite en UTC pour être déterministe et testable,
 * indépendamment de la machine qui exécute le code.
 */
export class LocalDate {
  private constructor(private readonly isoDate: string) {}

  static fromISODate(isoDate: string): LocalDate {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      throw new Error(`LocalDate invalide : "${isoDate}" (format attendu YYYY-MM-DD)`);
    }
    return new LocalDate(isoDate);
  }

  static fromUTCDate(date: Date): LocalDate {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return new LocalDate(`${y}-${m}-${d}`);
  }

  toISODate(): string {
    return this.isoDate;
  }

  private toUTCDate(): Date {
    const [y, m, d] = this.isoDate.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d));
  }

  plusDays(days: number): LocalDate {
    const next = this.toUTCDate();
    next.setUTCDate(next.getUTCDate() + days);
    return LocalDate.fromUTCDate(next);
  }

  isBefore(other: LocalDate): boolean {
    return this.isoDate < other.isoDate;
  }

  isSameOrBefore(other: LocalDate): boolean {
    return this.isoDate <= other.isoDate;
  }

  isAfter(other: LocalDate): boolean {
    return this.isoDate > other.isoDate;
  }

  equals(other: LocalDate): boolean {
    return this.isoDate === other.isoDate;
  }

  /** Nombre de jours (entier, peut être négatif) entre this et other : other - this. */
  daysUntil(other: LocalDate): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((other.toUTCDate().getTime() - this.toUTCDate().getTime()) / msPerDay);
  }
}
