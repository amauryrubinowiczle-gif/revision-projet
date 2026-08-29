# Architecture — Application de révision (récupération active + répétition espacée)

> Document d'architecture approuvé par l'utilisateur avant le début de l'implémentation
> (voir HANDOFF.md à la racine pour l'état d'avancement et les prochaines étapes). Toute
> décision d'implémentation doit rester cohérente avec ce document ; le modifier suppose
> de le signaler explicitement à l'utilisateur, pas de s'en écarter silencieusement.

## Contexte

Projet greenfield. L'utilisateur a fourni un brief détaillé demandant explicitement une
phase d'architecture validée *avant* tout code : un "moteur de révision" (pas une simple
appli de fiches), avec séparation stricte UI / logique métier / persistance / IA (future),
pensé dès aujourd'hui pour accueillir plusieurs agents IA sans refonte.

Une clarification a été obtenue de l'utilisateur pendant la conception : quand une fiche
contient plusieurs questions/définitions avec des résultats mixtes, **ce n'est pas un calcul
automatique** qui détermine si la fiche est globalement réussie — l'application informe
l'utilisateur de son détail de réussites/échecs, et **c'est lui qui décide** du verdict
global de la fiche (ce verdict pilote ensuite le calcul du prochain palier de révision).

## 1. Architecture générale

**Style retenu : Clean Architecture / Hexagonale (Ports & Adapters)**, avec un CQRS léger
sur les lectures.

Pourquoi :
- La contrainte du client — "toute la logique de répétition espacée doit être indépendante
  de React, testable en pur TypeScript" — est la définition même d'un domaine isolé entouré
  de ports implémentés par des adaptateurs (React pour l'UI, Drizzle/SQLite pour la
  persistance, un futur service IA).
- L'abstraction IA demandée ("le reste du logiciel ne doit jamais savoir quel modèle est
  utilisé") est un cas d'école port/adapter : `AIService` est un port défini dans le
  domaine ; `NotImplementedAIService` aujourd'hui, `ClaudeAIService`/`GPTAIService` demain,
  sont des adaptateurs interchangeables.
- Les évolutions futures (import PDF/OCR, sync cloud, mobile) deviennent de nouveaux
  adaptateurs ou cas d'usage, jamais des modifications du domaine.
- La séparation `/domain /application /infrastructure /ui /database /services` demandée
  par le client correspond déjà, presque mot pour mot, à une Clean Architecture.

Dépendances à sens unique, vers l'intérieur uniquement :

```
UI  →  Application (cas d'usage)  →  Domain (entités, règles métier, ports)
                 ↑                              ↑
        Infrastructure (implémente les ports : DB, IA, horloge, Tauri)
```

- **Domain** : entités, value objects, règles métier pures (moteur de répétition espacée
  inclus), interfaces des ports. Zéro import React/Tauri/SQL/Date système directe.
- **Application** : cas d'usage orchestrant le domaine via les ports. Testable avec des
  repositories fakes en mémoire, sans UI ni DB réelle.
- **Infrastructure** : implémentations concrètes — Drizzle/SQLite, pont Tauri, horloge
  système, service IA stub.
- **UI** : React/Tailwind, ne connaît que les cas d'usage — jamais les repositories ni le
  SQL directement.

CQRS léger : Bibliothèque/Dashboard/Statistiques lisent des *read-models* allégés
(`CardSummary`, `DashboardSummary`) plutôt que l'agrégat complet, pour rester rapide sur
plusieurs centaines de fiches. Les écritures passent par les cas d'usage classiques sur
l'agrégat complet.

## 2. Justification des choix techniques

- **React + TypeScript** : typage statique indispensable vu la richesse du modèle relationnel.
- **Tauri (plutôt qu'Electron)** : binaire léger, faible empreinte mémoire, cohérent avec
  une appli "sobre, orientée concentration". **100 % de la logique métier reste en
  TypeScript** dans la webview ; le Rust (`src-tauri/`) reste une coquille technique
  (fenêtre, plugin SQL, futur plugin filesystem) — jamais porteur de règles métier.
- **TailwindCSS** + **Radix UI** (primitives accessibles non stylées, pas encore installées)
  pour le style Notion/Obsidian et une navigation clavier irréprochable.
- **SQLite** : parfaitement adapté à une appli desktop mono-utilisateur, local-first.
- **Drizzle plutôt que Prisma — recommandation tranchée.** Prisma Client dépend en
  production d'un query engine binaire nécessitant normalement un runtime Node (absent
  dans une webview Tauri packagée). Drizzle est un query builder TypeScript-first sans
  moteur séparé : son mode "SQLite Proxy" se branche directement sur
  `@tauri-apps/plugin-sql` via un callback `(sql, params) => rows`, dans un adaptateur fin
  et isolé (`src/infrastructure/database/tauri-sqlite-driver.ts`). Risque assumé
  (combinaison moins rodée que Prisma/Node) mitigé par le Repository Pattern qui confine
  tout repli éventuel à `infrastructure/database/`. **Ce pont n'a jamais été exécuté
  réellement — c'est la toute première chose à valider (voir HANDOFF.md, risque n°1).**
- **TanStack Query** pour toutes les données issues des cas d'usage ; **Zustand** pour
  l'état UI local éphémère (machine d'état de l'écran de révision, thème).
- **React Router** en `MemoryRouter` (pas de barre d'adresse en desktop).
- **Tests** : Vitest pour domain/application (rapide, zéro DOM), React Testing Library
  pour l'UI (pas encore ajoutée aux dépendances — voir HANDOFF.md) ; E2E repoussé en phase
  tardive, non bloquant pour le MVP.

## 3. Modèles de données

Principe : les champs vivent au plus près de ce qui les fait changer ; aucune donnée
dupliquée qui pourrait diverger.

**Course** : id, name (unique), color?, createdAt/updatedAt.

**Tag** : id, name (unique), color?.

**Card** (agrégat racine) : id, title, courseId? (FK Course), **currentLevel** (1-7,
dénormalisé volontairement — lu à chaque calcul des fiches dues), **nextReviewDate** (DATE
pur, sans heure, pour éviter les pièges de fuseau horaire), lastReviewDate?, **isArchived**
(bool — remplace un champ "statut" figé : le statut affiché est *calculé*, pas stocké),
notes? (commentaire libre unique), createdAt/updatedAt.

**Question** : id, cardId (FK Card, cascade delete), order, prompt, answerText (pas
d'entité `Answer` séparée), createdAt/updatedAt.

**RevisionSheet** : id, questionId (FK Question, **unique** → relation 1–0..1), content
(markdown), createdAt/updatedAt. Une fiche de révision par question, affichée uniquement
après échec sur *cette* question précise.

**Definition** : id, cardId (FK Card, cascade delete), term, expectedAnswer, order,
linkedQuestionId? (FK Question, nullable — rattachement optionnel à une question précise).

**Exercise** (entité indépendante, pas imbriquée dans Card) : id, title, description?,
reference? (pointeur externe — fichier/URL/manuel), difficulty (EASY/MEDIUM/HARD),
courseId? (FK Course), createdAt/updatedAt.

**CardExercise** (jonction N–N, PK composite cardId+exerciseId, + order) : un exercice est
une ressource potentiellement partagée entre plusieurs fiches — prépare une vraie banque
d'exercices réutilisable, y compris générée par IA plus tard.

**CardTag** (jonction N–N, PK composite).

**Comment** : id, cardId (FK Card, cascade delete), body, createdAt. Entité séparée
(historique d'annotations horodatées), distincte du champ `notes` unique de Card.

**ReviewSession** : id, startedAt, endedAt?, cardsPlanned, cardsCompleted. Un lancement du
bouton "Réviser" — nécessaire pour calculer le streak et le temps moyen quotidien.

**CardReviewEvent** (une ligne par carte par session) : id, sessionId (FK ReviewSession),
cardId (FK Card), reviewedAt, **result** (SUCCESS/FAILURE — **décision explicite de
l'utilisateur**, pas un calcul automatique), levelBefore, levelAfter, exerciseProposedId?
(FK Exercise), timeSpentSeconds?, **completed** (bool, false tant que
`finalizeCardReview()` n'a pas été appelé — distingue une carte terminée d'une carte
abandonnée en session ; les statistiques ne doivent JAMAIS compter un événement non
complété).

**QuestionReviewResult** / **DefinitionReviewResult** (granularité fine) : auto-évaluées
par l'utilisateur au moment de chaque item. Nécessaire pour (1) le résumé factuel affiché
avant le verdict global, (2) la détection de "fiches en difficulté", (3) la future
fonctionnalité IA de détection des notions mal maîtrisées.

**Sur `successHistory`/`reviewHistory` cités par le brief comme champs de `Card`** : non
stockés comme colonnes dupliquées. Ce sont des **vues calculées** à partir de
`CardReviewEvent` (+ tables filles), source de vérité unique.

## 4. Relations entre objets

```
Course        1 ────< N   Card                  (Card.courseId, nullable)
Card          1 ────< N   Question               (cascade delete)
Question      1 ──── 0..1 RevisionSheet          (Question.id unique FK)
Card          1 ────< N   Definition             (cascade delete)
Definition    N ──── 0..1 Question               (Definition.linkedQuestionId, nullable)
Card          N ─── N     Exercise                (via CardExercise)
Card          N ─── N     Tag                     (via CardTag)
Card          1 ────< N   Comment                 (cascade delete)

ReviewSession 1 ────< N   CardReviewEvent
CardReviewEvent  N ──── 1  Card
CardReviewEvent  1 ────< N QuestionReviewResult   (cascade)
QuestionReviewResult N ──── 1 Question
CardReviewEvent  1 ────< N DefinitionReviewResult (cascade)
DefinitionReviewResult N ──── 1 Definition
CardReviewEvent  0..1 ──── 1 Exercise             (exerciseProposedId, nullable)
```

Suppressions : `Card → Question/Definition/Comment` en cascade est acceptable. En revanche
`CardReviewEvent → Card` et les résultats liés **ne cascadent pas** (`ON DELETE SET NULL`
en base) — supprimer une fiche ne doit pas détruire son historique. "Supprimer" dans la
Bibliothèque déclenche un **archivage logique** (`isArchived = true`) par défaut ; une
suppression physique définitive reste une action explicite séparée.

## 5. Flux de données clés

### 5.1 Ports du domaine (contrats) — voir `src/domain/ports/*.ts` pour le code exact

`CardRepository`, `ReviewHistoryRepository`, `ExerciseRepository`, `CourseRepository`,
`TagRepository`, `StatisticsRepository`, `Clock`, `AIService`. Chaque port est défini dans
le domaine et implémenté dans `infrastructure/`.

### 5.2 Le moteur de répétition espacée — `src/domain/policies/computeNextReview.ts`

100 % pur, zéro dépendance. Règle : échec → niveau 1, révision demain. Réussite →
niveau+1 (plafonné à 7), révision dans `REVIEW_INTERVALS_DAYS[niveau]` jours.

`summarizeCardResults.ts` — **pas une décision**, un résumé factuel (compteurs) affiché à
l'utilisateur pour qu'il décide lui-même du verdict de carte.

### 5.3 Flux "Réviser aujourd'hui" (bout en bout)

1. Clic "Réviser" → `StartReviewSessionUseCase` : récupère les fiches dues
   (`CardRepository.findDueToday`), ouvre une `ReviewSession`, résout les exercices
   disponibles par carte.
2. Pour chaque carte : `StartCardReviewUseCase` ouvre un `CardReviewEvent` (persistance
   incrémentale — résiste à un crash en session).
3. Pour chaque question : affichage → réponse → auto-évaluation →
   `SubmitQuestionResultUseCase` (enregistré immédiatement). Si échec, la `RevisionSheet`
   de cette question s'affiche automatiquement.
4. Même mécanisme pour chaque définition (`SubmitDefinitionResultUseCase`).
5. Exercice proposé via `selectExercise(niveau, résultats, exercicesDisponibles)`.
6. **Écran de fin de carte** : résumé factuel (`summarizeCardResults`) affiché, puis
   **l'utilisateur décide explicitement** si la fiche est globalement maîtrisée.
7. `CompleteCardReviewUseCase` : applique `computeNextReview` avec le verdict utilisateur,
   met à jour la carte, finalise le `CardReviewEvent` (`completed = true`).
8. Carte suivante ; sur la dernière, `EndReviewSessionUseCase` clôt la session.

### 5.4 Flux "création d'une fiche"

`CreateCardUseCase` valide les invariants (`validateNewCard` — titre non vide, ≥1
question), puis `CardRepository.createWithChildren(...)` persiste l'agrégat complet.

## 6. Organisation des dossiers

```
revision-projet/
├── src-tauri/              # Coquille Tauri (Rust) — fenêtre, plugin SQL, packaging. AUCUNE logique métier.
├── src/
│   ├── domain/              # Cœur métier pur — entities, value-objects, ports, policies, errors
│   ├── application/         # Cas d'usage — card/, review/, dashboard/, statistics/, import/ (vide, réservé IA)
│   ├── infrastructure/      # database/ (schema Drizzle, repositories), services/ai (stub IA), services/clock, di/container.ts
│   ├── ui/                  # pages/, components/, hooks/, state/, router/, theme/
│   └── shared/
├── drizzle/                 # Migrations générées par drizzle-kit (à générer, voir HANDOFF.md)
├── tests/                   # domain/, application/, ui/ (Vitest)
└── docs/ARCHITECTURE.md     # ce fichier
```

## 7. Risques techniques identifiés

1. **Pont Drizzle `sqlite-proxy` ↔ `tauri-plugin-sql` jamais exécuté réellement** — priorité n°1, voir HANDOFF.md.
2. **Migrations SQLite en production Tauri** — table `app_metadata(schema_version)`, sauvegarde du `.db` avant migration.
3. **Performance sur centaines de fiches** — index sur `nextReviewDate`/`courseId`/`isArchived`, read-models légers, liste virtualisée à ajouter (TanStack Virtual, pas encore installé).
4. **Fuseaux horaires / DST** — `Clock` abstrait, `LocalDate` en arithmétique UTC pure (déjà testé, voir tests/domain/LocalDate.test.ts).
5. **Non-régression du moteur SR** — tests exhaustifs déjà écrits (7 niveaux × succès/échec).
6. ~~Ambiguïté de la règle d'agrégation~~ — résolu : verdict utilisateur explicite.
7. **Suppression physique et intégrité de l'historique** — archivage logique par défaut.
8. **Coût des allers-retours IPC Tauri** — jointures groupées, cache TanStack Query, à profiler avec un jeu de données synthétique de 500+ fiches.
9. **Verrouillage architectural sur Drizzle** — confiné par le Repository Pattern.
10. **`createWithChildren` pas encore transactionnel** (voir commentaire dans `DrizzleCardRepository.ts`) — à corriger avant la Phase 3 (UI réelle de création de fiches), une fois le support transactionnel de sqlite-proxy validé.

## 8. Améliorations actées par rapport au brief initial

- Unification `successHistory`/`reviewHistory` en vues calculées depuis `CardReviewEvent`.
- Statut de fiche calculé, jamais stocké (sauf `isArchived`).
- Verdict de carte décidé par l'utilisateur, informé par un résumé factuel (changement acté en cours de conception).
- Paliers fixes par défaut, via une interface `SpacedRepetitionPolicy` remplaçable (`FixedStepSpacedRepetitionPolicy`) — ouvre la voie à un SM-2 optionnel plus tard.
- Persistance incrémentale pendant une session (résiste à un crash).
- Exercise en entité indépendante réutilisable (N–N).
- Read-models dédiés (`CardSummary`, `DashboardSummary`) séparés de l'agrégat complet.
