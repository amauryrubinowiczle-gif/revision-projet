import { QueryClient } from "@tanstack/react-query";

/**
 * Client TanStack Query partagé — toutes les données issues des cas d'usage (Bibliothèque,
 * Dashboard, Statistiques, session de révision) transitent par lui : cache, invalidation
 * après écriture, états de chargement (voir section 2 du document d'architecture).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/** Clés de cache centralisées — évite les chaînes magiques dispersées dans les hooks. */
export const queryKeys = {
  dashboard: ["dashboard"] as const,
  library: (filter: unknown) => ["library", filter] as const,
  statistics: ["statistics"] as const,
  card: (id: string) => ["card", id] as const,
  courses: ["courses"] as const,
  tags: ["tags"] as const,
  exercises: ["exercises"] as const,
};
