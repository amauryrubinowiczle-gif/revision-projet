# HANDOFF — reprise du projet dans Claude Code

Ce document est écrit pour toi, session Claude Code qui reprend ce projet — lis-le en
entier avant de toucher au code. Il complète `README.md` (mise en route) et
`docs/ARCHITECTURE.md` (le document d'architecture complet, approuvé par l'utilisateur
avant tout code — **ne t'en écarte pas sans le signaler explicitement à l'utilisateur**).

## Pourquoi ce transfert vers Claude Code

Ce projet a été démarré dans Cowork (session cloud + pont vers l'ordinateur de
l'utilisateur). Deux limites structurelles de cet environnement ont motivé le passage à
Claude Code, exécuté directement dans un terminal sur la machine de l'utilisateur :

1. **Réseau bloqué côté Cowork** — `npm install` n'a jamais pu être exécuté depuis Cowork
   (ni depuis le sandbox cloud, ni depuis le shell distant sur l'ordinateur de
   l'utilisateur : `registry.npmjs.org`, `crates.io`, etc. renvoyaient tous une 403
   "host_not_allowed", vraisemblablement une politique réseau propre à Cowork). Un
   terminal Claude Code, lui, utilise directement la connexion réseau réelle de la machine.
2. **Tauri a besoin d'une vraie fenêtre native** — `npm run tauri dev` ouvre une fenêtre
   graphique. Le shell distant de Cowork est une VM isolée sans affichage : impossible d'y
   lancer et d'y tester réellement l'application. Un terminal Claude Code sur la machine de
   l'utilisateur le peut.

L'utilisateur a confirmé avoir déjà fait, dans un terminal réel (pas via Cowork) :
`npm install`, l'installation de Rust (rustup), et `xcode-select --install`. **Vérifie que
`node_modules/` existe et que `cargo --version` fonctionne avant de continuer** — sinon
redemande ces trois étapes.

## Ce qui a été fait (et vérifié comment)

Tout le code ci-dessous a été écrit dans Cowork **sans jamais pouvoir exécuter `npm
install` ni `vitest`**. Pour compenser, deux vérifications réelles ont été faites :

- `src/domain/` et `src/application/` n'ont **aucune dépendance externe** (contrainte
  explicite du brief). Type-checkés en mode strict avec le compilateur TypeScript
  (`tsc`), zéro erreur.
- Exécution réelle (via `tsx`, sans `npm install`) des mêmes scénarios que les fichiers de
  test, dans `scripts/validate-domain.ts` (34 assertions) et `scripts/validate-application.ts`
  (4 assertions) — tous passent. **Une fois `npm test` fonctionnel, lance les vraies
  suites Vitest (`tests/domain/`, `tests/application/`) et supprime le dossier `scripts/`**,
  qui n'était qu'un pis-aller.

En revanche, **rien touchant à Drizzle, Tauri, React, TanStack Query ou Zustand n'a été
exécuté ni même type-checké** (ces couches dépendent de packages npm absents pendant
l'écriture). Traite `src/infrastructure/`, `src/ui/`, `src-tauri/` comme du code écrit
"à l'aveugle" contre la documentation officielle des librairies — probablement correct,
mais à valider en priorité (voir section suivante).

Détail par couche :

- **Domain** (`src/domain/`) — complet : entités (Card, Question, RevisionSheet,
  Definition, Exercise, Tag, Course, Comment, ReviewSession, CardReviewEvent,
  QuestionReviewResult, DefinitionReviewResult), value objects (LocalDate, ReviewLevel,
  ReviewOutcome, Difficulty, DueStatus, Ids brandés), policies (`computeNextReview`,
  `summarizeCardResults`, `selectExercise`, `validateNewCard`,
  `FixedStepSpacedRepetitionPolicy`), ports (7 interfaces), erreurs.
- **Application** (`src/application/`) — cas d'usage complets pour card/ (Create, GetLibrary,
  Archive, Delete), review/ (Start, StartCardReview, SubmitQuestionResult,
  SubmitDefinitionResult, CompleteCardReview, EndSession), dashboard/, statistics/.
- **Infrastructure** (`src/infrastructure/`) — schéma Drizzle complet (`database/schema.ts`),
  migration SQL initiale écrite à la main (`src-tauri/migrations/0001_init.sql`, **à
  regénérer avec `npm run db:generate` et comparer**), pont Drizzle↔Tauri
  (`database/tauri-sqlite-driver.ts`), repositories pour toutes les entités, stub IA
  (`services/ai/NotImplementedAIService.ts`), `SystemClock`, composition root (`di/container.ts`).
- **UI** (`src/ui/`) — squelette bootable : router (MemoryRouter), layout (`App.tsx`, nav
  sobre, dark mode), 5 pages. Dashboard et Statistiques sont **réellement branchés** sur
  leurs cas d'usage via des hooks TanStack Query. Bibliothèque affiche une liste minimale
  fonctionnelle. CardEditor et ReviewSession sont des coquilles vides (voir "reste à
  faire").
- **Tauri** (`src-tauri/`) — `Cargo.toml`, `main.rs` (enregistre le plugin SQL avec la
  migration embarquée), `tauri.conf.json`, `capabilities/default.json`. Rust **ne contient
  et ne doit jamais contenir de logique métier**.

## À valider en priorité, avant toute nouvelle fonctionnalité

1. **Le pont Drizzle/Tauri** (`src/infrastructure/database/tauri-sqlite-driver.ts`) —
   risque technique n°1 du document d'architecture. Lance `npm run tauri dev`, essaie une
   création de fiche minimale (même via un script ad hoc), vérifie qu'insert/select
   fonctionnent et que le mapping objets-clés → lignes positionnelles est correct. Si le
   comportement diffère de ce qui est codé, **seul ce fichier doit changer** (Repository
   Pattern).
2. **`npm run db:generate`** — comparer la sortie à `src-tauri/migrations/0001_init.sql`
   (écrit à la main faute d'accès à drizzle-kit). Basculer sur les migrations générées.
3. **`DrizzleCardRepository.createWithChildren`** — actuellement une suite d'insertions
   séquentielles, PAS enveloppée dans une transaction (le support transactionnel de
   `drizzle-orm/sqlite-proxy` n'a pas pu être vérifié). À corriger avant que l'UI de
   création de fiche soit utilisable en pratique — sinon un échec partiel peut laisser une
   fiche incomplète en base.
4. `npm run typecheck` et `npm test` sur l'ensemble du projet — pour rattraper tout ce que
   `tsc`/`tsx` en isolation n'ont pas pu couvrir (infrastructure/, ui/).

## Ce qu'il reste à faire (phases du document d'architecture)

- **Phase 3 — Création de fiches (UI)** : formulaire complet dans
  `src/ui/pages/CardEditor/CardEditorPage.tsx` (actuellement une coquille vide) — titre,
  cours (autocomplete + création à la volée via `CourseRepository`), questions/réponses
  dynamiques avec fiche de révision par question, définitions, sélection/création
  d'exercices (`ExerciseRepository`), tags (`TagRepository`), commentaire initial. Branché
  sur `CreateCardUseCase`, déjà prêt.
- **Phase 4 — Bibliothèque** : `LibraryPage.tsx` a un squelette fonctionnel mais sans
  filtres/recherche/tri réels côté UI (le port `LibraryFilter` les supporte déjà côté
  domaine), sans pagination ni liste virtualisée (ajouter `@tanstack/react-virtual` pour
  tenir la promesse "plusieurs centaines de fiches" du brief), sans actions
  modifier/archiver/supprimer câblées dans l'UI (les use cases existent : `ArchiveCardUseCase`,
  `DeleteCardUseCase`).
- **Phase 5 — Session de révision (la plus grosse pièce manquante)** :
  `ReviewSessionPage.tsx` est une coquille vide. La machine d'état est déjà écrite
  (`src/ui/state/reviewSessionStore.ts`, Zustand) mais pas encore branchée à un composant.
  Il faut construire l'écran complet suivant le flux de la section 5.3 de
  `docs/ARCHITECTURE.md` : question → réponse → auto-évaluation → fiche de révision si
  échec → définitions (même mécanisme) → exercice proposé → résumé factuel
  (`summarizeCardResults`) → **décision explicite de l'utilisateur** (Oui/Non "avez-vous
  maîtrisé cette fiche ?") → `CompleteCardReviewUseCase` → carte suivante → écran de fin de
  session. Tous les cas d'usage nécessaires existent déjà dans `src/application/review/`.
- **Phase 6 — Statistiques** : `StatisticsPage.tsx` affiche déjà les chiffres clés
  (branchés sur `GetStatisticsUseCase`) mais sans les "graphiques simples" demandés par le
  brief — à ajouter (une lib légère type Recharts, ou du SVG à la main pour rester sobre).
- **Phase 7 — Finitions** : `AIService` reste un stub volontaire (`NotImplementedError`)
  tant que l'utilisateur ne demande pas d'y brancher un vrai fournisseur — ne pas
  l'implémenter de ta propre initiative. Raccourcis clavier, packaging/distribution
  (`tauri build`), tests UI (React Testing Library — pas encore dans `package.json`,
  à ajouter en devDependency quand ces tests seront écrits), E2E (repoussé, non bloquant).

## Consignes à respecter en continuant

- **Ne jamais mettre de logique métier dans `src/ui/` ni `src-tauri/`.** Toute règle
  (calcul de niveau, agrégation, sélection d'exercice...) vit dans `src/domain/`, testable
  sans React ni DB — c'est la contrainte non négociable du client.
- **`AIService` reste un port abstrait.** Le reste du logiciel ne doit jamais savoir quel
  modèle est branché derrière. N'ajoute pas d'appel direct à une API IA ailleurs que dans
  un futur adaptateur `infrastructure/services/ai/*`.
- **Le verdict de fin de carte est toujours une décision utilisateur explicite**, jamais un
  calcul automatique à partir des résultats question par question — c'est un choix acté
  avec l'utilisateur pendant la conception, ne pas le "corriger" vers une agrégation auto.
- **`isArchived` avant suppression physique.** "Supprimer" dans la Bibliothèque doit
  archiver par défaut (`ArchiveCardUseCase`) ; la suppression physique
  (`DeleteCardUseCase`) est une action distincte et volontaire.
- **Écrire les tests domain/application en même temps que le code**, comme le reste du
  projet (`tests/domain/`, `tests/application/` avec les fakes de
  `tests/application/fakes.ts`) — pas après coup.
- **Respecter le style déjà en place** : sobre, peu de boutons, dark mode par défaut,
  variables CSS dans `src/ui/theme/globals.css`, composants partagés dans
  `src/ui/components/` (`StatTile`, `EmptyState`) à réutiliser/étendre plutôt que dupliquer.
- **Avant d'ajouter une dépendance**, vérifie qu'elle est justifiable dans l'esprit "code
  clair et maintenable plutôt que dernière techno" du brief — préférer une lib légère
  (ex. Radix UI pour l'accessibilité des interactions du flux de révision) à un framework
  UI complet.
- Le document `docs/ARCHITECTURE.md` fait foi sur les choix déjà justifiés (Drizzle vs
  Prisma, etc.) — ne rouvre pas ces débats sans une raison technique nouvelle et sans en
  informer l'utilisateur.
