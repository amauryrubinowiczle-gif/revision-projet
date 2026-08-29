import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@infrastructure/di/container";
import { queryKeys } from "@ui/state/queryClient";

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: () => getContainer().courseRepository.findAll(),
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string | null }) => getContainer().courseRepository.create(name, color),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses }),
  });
}
