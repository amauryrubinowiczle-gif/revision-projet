import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Config Vite adaptée à Tauri : voir https://tauri.app/develop/#prerequisites
// - ne jamais binder sur un port aléatoire (Tauri attend un port fixe)
// - ignorer src-tauri pour le HMR (évite les boucles de rebuild Rust <-> Vite)
export default defineConfig(async () => ({
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
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
