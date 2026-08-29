import type { Config } from "drizzle-kit";

/**
 * Config drizzle-kit — génère les migrations SQL (fichiers .sql versionnés et lisibles,
 * voir justification section 2) à partir de src/infrastructure/database/schema.ts.
 *
 * Usage : `npm run db:generate` après toute modification de schema.ts.
 * Les fichiers générés vont dans drizzle/ (voir organisation des dossiers, section 6) ;
 * la première migration (0001_init.sql) a été écrite à la main dans src-tauri/migrations/
 * en attendant qu'un environnement avec accès réseau/npm puisse exécuter drizzle-kit.
 */
export default {
  schema: "./src/infrastructure/database/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
} satisfies Config;
