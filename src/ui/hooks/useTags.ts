import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@infrastructure/di/container";
import { queryKeys } from "@ui/state/queryClient";

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => getContainer().tagRepository.findAll(),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => getContainer().tagRepository.create(name, null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
  });
}
