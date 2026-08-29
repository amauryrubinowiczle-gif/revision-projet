import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@infrastructure/di/container";
import { ArchiveCardUseCase } from "@application/card/ArchiveCardUseCase";
import { UnarchiveCardUseCase } from "@application/card/UnarchiveCardUseCase";
import { DeleteCardUseCase } from "@application/card/DeleteCardUseCase";
import type { CardId } from "@domain/value-objects/Ids";
import { queryKeys } from "@ui/state/queryClient";

function useInvalidateLibrary() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["library"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    queryClient.invalidateQueries({ queryKey: queryKeys.statistics });
  };
}

/** "Supprimer" dans la Bibliothèque archive par défaut — voir section 4 du document d'architecture. */
export function useArchiveCard() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: CardId) => new ArchiveCardUseCase(getContainer().cardRepository).execute(id),
    onSuccess: invalidate,
  });
}

/** Remet une fiche archivée en activité (retour utilisateur). */
export function useUnarchiveCard() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: CardId) => new UnarchiveCardUseCase(getContainer().cardRepository).execute(id),
    onSuccess: invalidate,
  });
}

/** Suppression physique définitive — action distincte, volontaire (typiquement depuis la vue "archivées"). */
export function useDeleteCard() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: CardId) => new DeleteCardUseCase(getContainer().cardRepository).execute(id),
    onSuccess: invalidate,
  });
}
