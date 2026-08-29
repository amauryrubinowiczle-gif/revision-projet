import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@infrastructure/di/container";
import type { CardId } from "@domain/value-objects/Ids";
import { queryKeys } from "@ui/state/queryClient";

/** Fiche complète (agrégat) pour l'édition — pas le read-model CardSummary de la Bibliothèque. */
export function useCard(id: CardId | undefined) {
  return useQuery({
    queryKey: queryKeys.card(id ?? ""),
    queryFn: () => getContainer().cardRepository.findById(id as CardId),
    enabled: id !== undefined,
  });
}
