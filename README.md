# Révision — moteur de révision par récupération active et répétition espacée

Application de bureau (React + TypeScript + Tauri + TailwindCSS + SQLite + Drizzle) construite
selon une architecture hexagonale (Clean Architecture). Voir le document d'architecture complet
livré séparément pour la justification des choix, le modèle de données, les flux et les risques
identifiés — ce README couvre uniquement l'état du code et la mise en route.

## État d'avancement

Fait dans cette session (Phases 0 à 2, une bonne partie de 3-6) :

- **Phase 0** — Scaffolding complet : `package.json`, TypeScript, Vite, Tailwind (dark mode,
  palette Notion/Obsidian), Vitest, ESLint, structure de dossiers hexagonale.
- **Phase 1** — Domaine complet : entités (`Card`, `Question`, `RevisionSheet`, `Definition`,
  `Exercise`, `Tag`, `Course`, `Comment`, `ReviewSession`, `CardReviewEvent`...), value objects
  (`LocalDate`, `ReviewLevel`, `ReviewOutcome`, `DueStatus`), ports (`CardRepository`,
  `ReviewHistoryRepository`, `ExerciseRepository`, `CourseRepository`, `TagRepository`,
  `StatisticsRepository`, `Clock`, `AIService`). Schéma Drizzle complet + migration SQL initiale
  écrite à la main (`src-tauri/migrations/0001_init.sql`, à régénérer avec `npm run db:generate`
  dès que l'installation est possible). Repositories Drizzle pour toutes les entités.
- **Phase 2** — Moteur de répétition espacée : `computeNextReview` (paliers fixes 1..7),
  `summarizeCardResults` (résumé factuel, PAS un calcul automatique — voir "Décision produit"
  ci-dessous), `selectExercise`, cas d'usage complets de `application/review/*`.
- **Phases 3-6 (amorcées)** — `CreateCardUseCase`, `GetLibraryUseCase`, `ArchiveCardUseCase`,
  `DeleteCardUseCase`, `GetDashboardSummaryUseCase`, `GetStatisticsUseCase`. Squelette UI bootable
  (router, layout, 5 pages) avec Dashboard et Statistiques déjà branchés sur leurs cas d'usage.
  Bibliothèque et Création de fiche affichent une coquille fonctionnelle ; l'écran de session de
  révision (le plus riche en interactions) reste à construire complètement.
- **Phase 7** — `AIService` : stub `NotImplementedAIService` en place, lève `NotImplementedError`
  sur chaque méthode, branché dans la composition root (`infrastructure/di/container.ts`).

Reste à faire : formulaire complet de création de fiche (Phase 3), Bibliothèque avec
filtres/recherche/pagination réels et liste virtualisée (Phase 4), écran de session de révision
avec la machine d'état complète (Phase 5, le state Zustand `reviewSessionStore.ts` est prêt mais
pas encore branché à un composant), graphiques de la page Statistiques (Phase 6), tests UI
(React Testing Library), packaging/distribution.

## Décision produit actée pendant la conception

Le brief initial ne précisait pas comment agréger les résultats question par question en un
verdict de carte (qui pilote le palier de répétition). Décision de l'utilisateur : **pas de calcul
automatique** — l'application affiche un résumé factuel (ex. "3/4 questions réussies") et c'est
l'utilisateur qui décide explicitement si la fiche est globalement maîtrisée. Voir
`domain/policies/summarizeCardResults.ts` et le flux détaillé dans le document d'architecture,
section 5.3.

## Terminer l'installation

Cette session cloud n'avait accès ni au registre npm ni à un toolchain Rust/Cargo (réseau bloqué
par la politique de l'organisation) — le code a donc été écrit et vérifié "à la main" (voir
"Comment ça a été vérifié" ci-dessous) mais **`npm install` n'a jamais pu être exécuté**. Sur votre
machine :

```bash
# 1. Installer les dépendances Node
npm install

# 2. Installer Rust (si pas déjà fait) — nécessaire pour Tauri
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.sh | sh

# 3. Vérifier que drizzle-kit génère bien la même migration que celle écrite à la main
npm run db:generate
# comparer le résultat à src-tauri/migrations/0001_init.sql — voir le commentaire en tête de ce fichier

# 4. Lancer l'application en mode développement
npm run tauri dev
```

⚠️ **Point de vigilance prioritaire** (risque technique n°1 du document d'architecture) : le pont
`src/infrastructure/database/tauri-sqlite-driver.ts` entre Drizzle (mode `sqlite-proxy`) et
`@tauri-apps/plugin-sql` n'a **jamais pu être exécuté** dans cette session. Il suit la
documentation officielle des deux librairies mais DOIT être testé (insert/select/transaction)
avant de faire confiance aux repositories qui en dépendent. C'est la toute première chose à
valider une fois `npm run tauri dev` lancé.

## Comment ça a été vérifié (sans npm install)

`src/domain/` et `src/application/` n'ont **aucune dépendance externe** (ni React, ni Tauri, ni
Drizzle) — c'est la contrainte que vous aviez posée pour le moteur de répétition espacée, étendue
ici à toute la logique métier. Cela a permis de :

- Type-checker ces deux couches en mode strict avec le compilateur TypeScript, sans erreur.
- Exécuter réellement (via `tsx`, sans installation) les mêmes scénarios que les fichiers de test
  `tests/domain/*.test.ts` et `tests/application/*.test.ts` : `scripts/validate-domain.ts` et
  `scripts/validate-application.ts`. Les deux passent intégralement (34 + 4 assertions).

Une fois `npm install` exécuté, utilisez les vraies commandes (`npm test`, `npm run test:domain`,
`npm run test:application`) — plus fiables et plus rapides — et supprimez le dossier `scripts/`,
qui n'est qu'un pis-aller pour cette session sans réseau.

## Commandes utiles (après `npm install`)

| Commande | Effet |
|---|---|
| `npm run tauri dev` | Lance l'application en développement |
| `npm test` | Tous les tests Vitest |
| `npm run test:domain` | Uniquement le moteur de répétition espacée et le reste du domaine |
| `npm run test:application` | Cas d'usage avec repositories fakes en mémoire |
| `npm run typecheck` | `tsc --noEmit` sur tout le projet |
| `npm run db:generate` | Régénère les migrations SQL depuis `schema.ts` |
