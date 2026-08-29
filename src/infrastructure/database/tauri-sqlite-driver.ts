import Database from "@tauri-apps/plugin-sql";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

/**
 * LE PONT Drizzle ↔ Tauri — voir justification technique (section 2) et risque n°1 du
 * document d'architecture. Drizzle en mode "sqlite-proxy" délègue chaque requête à un
 * callback `(sql, params, method) => Promise<{ rows }>` ; on branche ce callback sur
 * `@tauri-apps/plugin-sql`, qui exécute réellement le SQL côté Rust (sqlx) et renvoie
 * les résultats via IPC.
 *
 * ⚠️ SPIKE DE VALIDATION REQUIS (Phase 0, risque technique n°1 du document d'architecture) :
 * ce fichier n'a PAS pu être exécuté dans cette session (ni Rust/cargo, ni accès réseau
 * npm disponibles dans cet environnement). Le mapping ci-dessous suit la documentation
 * officielle de drizzle-orm/sqlite-proxy et de @tauri-apps/plugin-sql, mais DOIT être
 * validé par un test d'intégration réel (insert/select/transaction) avant de construire
 * les repositories dessus. Si le pont se comporte différemment en pratique, seul CE
 * fichier change — le Repository Pattern confine l'impact ici (voir section 2).
 */

const DB_CONNECTION_STRING = "sqlite:revision.db";

let sqliteInstance: Database | null = null;

async function getDatabase(): Promise<Database> {
  if (!sqliteInstance) {
    sqliteInstance = await Database.load(DB_CONNECTION_STRING);
  }
  return sqliteInstance;
}

export const db: SqliteRemoteDatabase<typeof schema> = drizzle(async (sql, params, method) => {
  const database = await getDatabase();

  if (method === "run") {
    await database.execute(sql, params);
    return { rows: [] };
  }

  // "get" / "all" / "values" : @tauri-apps/plugin-sql renvoie des objets keyed par colonne ;
  // sqlite-proxy attend des lignes positionnelles (tableaux de valeurs) — d'où la conversion.
  const rows = await database.select<Record<string, unknown>[]>(sql, params);
  const positionalRows = rows.map((row) => Object.values(row));

  if (method === "get") {
    return { rows: positionalRows[0] ?? [] };
  }
  return { rows: positionalRows };
}, { schema, logger: false });

/** Ferme la connexion — utile pour les tests d'intégration et l'arrêt propre de l'app. */
export async function closeDatabase(): Promise<void> {
  if (sqliteInstance) {
    await sqliteInstance.close();
    sqliteInstance = null;
  }
}
