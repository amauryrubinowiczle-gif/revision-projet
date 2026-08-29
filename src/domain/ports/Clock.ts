import type { LocalDate } from "../value-objects/LocalDate";

/**
 * Abstrait le temps système. Indispensable pour tester le moteur de répétition espacée
 * de manière déterministe (voir risque technique n°4 : fuseaux horaires, DST) et pour
 * permettre, plus tard, une "frontière de journée" configurable (ex. 4h du matin plutôt
 * que minuit strict) sans toucher au domaine.
 */
export interface Clock {
  today(): LocalDate;
  now(): Date;
}
