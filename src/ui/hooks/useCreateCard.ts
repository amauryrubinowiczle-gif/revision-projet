import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@infrastructure/di/container";
import { CreateCardUseCase } from "@application/card/CreateCardUseCase";
import { UpdateCardUseCase } from "@application/card/UpdateCardUseCase";
import type { NewCardAggregate } from "@domain/entities/NewCardAggregate";
import type { CardEditInput } from "@domain/ports/CardRepository";
import type { CardId } from "@domain/value-objects/Ids";
import { queryKeys } from "@ui/state/queryClient";

export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCardAggregate) => {
      const { cardRepository } = getContainer();
      return new CreateCardUseCase(cardRepository).execute(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: CardId; input: CardEditInput }) => {
      const { cardRepository } = getContainer();
      return new UpdateCardUseCase(cardRepository).execute(id, input);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics });
      queryClient.invalidateQueries({ queryKey: ["library"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.card(id) });
    },
  });
}
