// Coquille Tauri minimale : fenêtre + plugin SQL avec migrations embarquées.
// Aucune logique métier ici (voir section 2 et 6 du document d'architecture) — la seule
// responsabilité de ce fichier est de démarrer la fenêtre et d'enregistrer le plugin SQL
// avec les migrations SQL versionnées de src-tauri/migrations/.

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:revision.db",
                    vec![tauri_plugin_sql::Migration {
                        version: 1,
                        description: "init",
                        sql: include_str!("../migrations/0001_init.sql"),
                        kind: tauri_plugin_sql::MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("erreur au démarrage de l'application Tauri");
}
