import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

/**
 * Schéma Drizzle — reflète fidèlement le modèle de données de la section 3 du document
 * d'architecture. Toutes les dates sont stockées en TEXT ISO (YYYY-MM-DD pour les dates
 * calendaires pures type nextReviewDate, YYYY-MM-DDTHH:mm:ss.sssZ pour les horodatages),
 * pour correspondre exactement aux value objects du domaine (LocalDate) sans conversion
 * ambiguë. Les booléens sont stockés en INTEGER (0/1), convention SQLite standard.
 *
 * app_metadata sert de table de version de schéma pour les migrations (voir risque
 * technique n°2 du document d'architecture).
 */

export const appMetadata = sqliteTable("app_metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"),
});

export const cards = sqliteTable(
  "cards",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
    // Dénormalisés volontairement (voir section 3) : lus à chaque calcul des fiches dues.
    currentLevel: integer("current_level").notNull().default(1),
    nextReviewDate: text("next_review_date").notNull(),
    lastReviewDate: text("last_review_date"),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    // Index critiques pour la performance sur plusieurs centaines de fiches (risque n°3).
    nextReviewDateIdx: index("cards_next_review_date_idx").on(table.nextReviewDate),
    courseIdIdx: index("cards_course_id_idx").on(table.courseId),
    isArchivedIdx: index("cards_is_archived_idx").on(table.isArchived),
  }),
);

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    prompt: text("prompt").notNull(),
    answerText: text("answer_text").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    cardIdIdx: index("questions_card_id_idx").on(table.cardId),
  }),
);

export const revisionSheets = sqliteTable("revision_sheets", {
  id: text("id").primaryKey(),
  // Relation 1-0..1 stricte : une question a au plus une fiche de révision.
  questionId: text("question_id")
    .notNull()
    .unique()
    .references(() => questions.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const definitions = sqliteTable(
  "definitions",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    expectedAnswer: text("expected_answer").notNull(),
    order: integer("order").notNull(),
    // Extension proposée (section 8) : rattachement optionnel à une question précise.
    linkedQuestionId: text("linked_question_id").references(() => questions.id, { onDelete: "set null" }),
  },
  (table) => ({
    cardIdIdx: index("definitions_card_id_idx").on(table.cardId),
  }),
);

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  reference: text("reference"),
  difficulty: text("difficulty", { enum: ["EASY", "MEDIUM", "HARD"] }).notNull(),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// N-N : un exercice est une ressource potentiellement partagée entre plusieurs fiches (voir section 3).
export const cardExercises = sqliteTable(
  "card_exercises",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.cardId, table.exerciseId] }),
  }),
);

export const cardTags = sqliteTable(
  "card_tags",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.cardId, table.tagId] }),
  }),
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    cardIdIdx: index("comments_card_id_idx").on(table.cardId),
  }),
);

export const reviewSessions = sqliteTable("review_sessions", {
  id: text("id").primaryKey(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  cardsPlanned: integer("cards_planned").notNull(),
  cardsCompleted: integer("cards_completed").notNull().default(0),
});

// Pas de cascade delete depuis Card (voir section 4) : l'historique survit à l'archivage
// et même à une suppression physique de la fiche (onDelete "set null" plutôt que "cascade").
export const cardReviewEvents = sqliteTable(
  "card_review_events",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => reviewSessions.id, { onDelete: "cascade" }),
    cardId: text("card_id").references(() => cards.id, { onDelete: "set null" }),
    reviewedAt: text("reviewed_at").notNull(),
    // Verdict décidé par l'utilisateur (voir section 5.3) — pas un calcul automatique.
    result: text("result", { enum: ["SUCCESS", "FAILURE"] }).notNull(),
    levelBefore: integer("level_before").notNull(),
    levelAfter: integer("level_after").notNull(),
    exerciseProposedId: text("exercise_proposed_id").references(() => exercises.id, { onDelete: "set null" }),
    timeSpentSeconds: integer("time_spent_seconds"),
    // false tant que finalizeCardReview() n'a pas été appelé (persistance incrémentale —
    // voir section 8). Distingue une carte réellement terminée d'une carte abandonnée en
    // cours de session (fermeture de l'app, crash) : les statistiques (taux de réussite,
    // streak) ne doivent compter QUE les événements complétés, jamais un enregistrement
    // provisoire créé au début du traitement de la carte.
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  },
  (table) => ({
    cardIdIdx: index("card_review_events_card_id_idx").on(table.cardId),
    sessionIdIdx: index("card_review_events_session_id_idx").on(table.sessionId),
    completedIdx: index("card_review_events_completed_idx").on(table.completed),
  }),
);

export const questionReviewResults = sqliteTable(
  "question_review_results",
  {
    id: text("id").primaryKey(),
    cardReviewEventId: text("card_review_event_id")
      .notNull()
      .references(() => cardReviewEvents.id, { onDelete: "cascade" }),
    questionId: text("question_id").references(() => questions.id, { onDelete: "set null" }),
    result: text("result", { enum: ["SUCCESS", "FAILURE"] }).notNull(),
    revisionSheetShown: integer("revision_sheet_shown", { mode: "boolean" }).notNull().default(false),
    timeSpentSeconds: integer("time_spent_seconds"),
  },
  (table) => ({
    eventIdIdx: index("question_review_results_event_id_idx").on(table.cardReviewEventId),
  }),
);

export const definitionReviewResults = sqliteTable(
  "definition_review_results",
  {
    id: text("id").primaryKey(),
    cardReviewEventId: text("card_review_event_id")
      .notNull()
      .references(() => cardReviewEvents.id, { onDelete: "cascade" }),
    definitionId: text("definition_id").references(() => definitions.id, { onDelete: "set null" }),
    result: text("result", { enum: ["SUCCESS", "FAILURE"] }).notNull(),
  },
  (table) => ({
    eventIdIdx: index("definition_review_results_event_id_idx").on(table.cardReviewEventId),
  }),
);
