import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@infrastructure/di/container";
import type { Exercise } from "@domain/entities/Exercise";
import { queryKeys } from "@ui/state/queryClient";

export function useExercises() {
  return useQuery({
    queryKey: queryKeys.exercises,
    queryFn: () => getContainer().exerciseRepository.findAll(),
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt">) => getContainer().exerciseRepository.create(exercise),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.exercises }),
  });
}
