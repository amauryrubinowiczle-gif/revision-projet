-- Migration initiale — générée par `npm run db:generate` à partir de
-- src/infrastructure/database/schema.ts (drizzle-kit 0.31.10), puis copiée ici telle
-- quelle (drizzle/0000_curved_strong_guy.sql) à l'exception de la dernière ligne
-- (seed de app_metadata, hors périmètre de drizzle-kit generate qui ne reflète que le DDL).
-- Toute modification de schema.ts doit repasser par `npm run db:generate` puis être
-- recopiée ici — c'est ce fichier qu'embarque src-tauri/src/main.rs via include_str!.

CREATE TABLE `app_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `card_exercises` (
	`card_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order` integer NOT NULL,
	PRIMARY KEY(`card_id`, `exercise_id`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `card_review_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`card_id` text,
	`reviewed_at` text NOT NULL,
	`result` text NOT NULL,
	`level_before` integer NOT NULL,
	`level_after` integer NOT NULL,
	`exercise_proposed_id` text,
	`time_spent_seconds` integer,
	`completed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `review_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`exercise_proposed_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `card_review_events_card_id_idx` ON `card_review_events` (`card_id`);--> statement-breakpoint
CREATE INDEX `card_review_events_session_id_idx` ON `card_review_events` (`session_id`);--> statement-breakpoint
CREATE INDEX `card_review_events_completed_idx` ON `card_review_events` (`completed`);--> statement-breakpoint
CREATE TABLE `card_tags` (
	`card_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`card_id`, `tag_id`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`course_id` text,
	`current_level` integer DEFAULT 1 NOT NULL,
	`next_review_date` text NOT NULL,
	`last_review_date` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `cards_next_review_date_idx` ON `cards` (`next_review_date`);--> statement-breakpoint
CREATE INDEX `cards_course_id_idx` ON `cards` (`course_id`);--> statement-breakpoint
CREATE INDEX `cards_is_archived_idx` ON `cards` (`is_archived`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_card_id_idx` ON `comments` (`card_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_name_unique` ON `courses` (`name`);--> statement-breakpoint
CREATE TABLE `definition_review_results` (
	`id` text PRIMARY KEY NOT NULL,
	`card_review_event_id` text NOT NULL,
	`definition_id` text,
	`result` text NOT NULL,
	FOREIGN KEY (`card_review_event_id`) REFERENCES `card_review_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`definition_id`) REFERENCES `definitions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `definition_review_results_event_id_idx` ON `definition_review_results` (`card_review_event_id`);--> statement-breakpoint
CREATE TABLE `definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`term` text NOT NULL,
	`expected_answer` text NOT NULL,
	`order` integer NOT NULL,
	`linked_question_id` text,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linked_question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `definitions_card_id_idx` ON `definitions` (`card_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`reference` text,
	`difficulty` text NOT NULL,
	`course_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `question_review_results` (
	`id` text PRIMARY KEY NOT NULL,
	`card_review_event_id` text NOT NULL,
	`question_id` text,
	`result` text NOT NULL,
	`revision_sheet_shown` integer DEFAULT false NOT NULL,
	`time_spent_seconds` integer,
	FOREIGN KEY (`card_review_event_id`) REFERENCES `card_review_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `question_review_results_event_id_idx` ON `question_review_results` (`card_review_event_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`order` integer NOT NULL,
	`prompt` text NOT NULL,
	`answer_text` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `questions_card_id_idx` ON `questions` (`card_id`);--> statement-breakpoint
CREATE TABLE `review_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`cards_planned` integer NOT NULL,
	`cards_completed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `revision_sheets` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revision_sheets_question_id_unique` ON `revision_sheets` (`question_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
INSERT OR IGNORE INTO app_metadata (key, value) VALUES ('schema_version', '1');
