import type { Clock } from "@domain/ports/Clock";
import { LocalDate } from "@domain/value-objects/LocalDate";

/** Implémentation concrète de Clock basée sur l'horloge système. */
export class SystemClock implements Clock {
  today(): LocalDate {
    return LocalDate.fromUTCDate(new Date());
  }

  now(): Date {
    return new Date();
  }
}
