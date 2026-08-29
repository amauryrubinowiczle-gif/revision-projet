import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vitest couvre domain/ (pur, sans DOM) et application/ (fakes en mémoire) en environnement
// "node" par défaut. Les tests UI (tests/ui/, React Testing Library) basculent en jsdom via
// une annotation par fichier (`// @vitest-environment jsdom` en tête de fichier) —
// `environmentMatchGlobs` n'existe plus dans l'API Vitest 4.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@domain": "/src/domain",
      "@application": "/src/application",
      "@infrastructure": "/src/infrastructure",
      "@ui": "/src/ui",
      "@shared": "/src/shared",
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup-jsdom.ts"],
  },
});
