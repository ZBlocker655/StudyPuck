CREATE TABLE "card_entry_daily_stats" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"date" text NOT NULL,
	"notes_captured" integer DEFAULT 0,
	"notes_processed" integer DEFAULT 0,
	"notes_deferred" integer DEFAULT 0,
	"notes_deleted" integer DEFAULT 0,
	"draft_cards_created" integer DEFAULT 0,
	"cards_promoted_to_active" integer DEFAULT 0,
	"groups_created" integer DEFAULT 0,
	CONSTRAINT "card_entry_daily_stats_user_id_language_id_date_pk" PRIMARY KEY("user_id","language_id","date")
);
--> statement-breakpoint
CREATE TABLE "inbox_notes" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"note_id" text NOT NULL,
	"content" text NOT NULL,
	"state" text DEFAULT 'unprocessed',
	"source_type" text DEFAULT 'manual',
	"source_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "inbox_notes_user_id_language_id_note_id_pk" PRIMARY KEY("user_id","language_id","note_id")
);
--> statement-breakpoint
CREATE TABLE "note_card_links" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"note_id" text NOT NULL,
	"card_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "note_card_links_user_id_language_id_note_id_card_id_pk" PRIMARY KEY("user_id","language_id","note_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "card_review_daily_stats" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"date" text NOT NULL,
	"cards_reviewed" integer DEFAULT 0,
	"total_review_time_minutes" integer DEFAULT 0,
	"cards_rated_easy" integer DEFAULT 0,
	"cards_rated_medium" integer DEFAULT 0,
	"cards_rated_hard" integer DEFAULT 0,
	"cards_snoozed" integer DEFAULT 0,
	"cards_disabled" integer DEFAULT 0,
	"cards_pinned_to_drills" integer DEFAULT 0,
	CONSTRAINT "card_review_daily_stats_user_id_language_id_date_pk" PRIMARY KEY("user_id","language_id","date")
);
--> statement-breakpoint
CREATE TABLE "card_review_srs" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"card_id" text NOT NULL,
	"next_due" integer DEFAULT 0 NOT NULL,
	"interval_days" integer DEFAULT 1,
	"ease_factor" real DEFAULT 2.5,
	"review_count" integer DEFAULT 0,
	"last_reviewed" integer,
	"metadata" jsonb,
	CONSTRAINT "card_review_srs_user_id_language_id_card_id_pk" PRIMARY KEY("user_id","language_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "translation_drill_context" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"card_id" text NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"added_from" text,
	"added_at" timestamp with time zone DEFAULT now(),
	"last_used" timestamp with time zone,
	"usage_count" integer DEFAULT 0,
	"state_until" timestamp with time zone,
	"cefr_override" text,
	"metadata" jsonb,
	CONSTRAINT "translation_drill_context_user_id_language_id_card_id_pk" PRIMARY KEY("user_id","language_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "translation_drill_daily_stats" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"date" text NOT NULL,
	"sentences_translated" integer DEFAULT 0,
	"total_session_time_minutes" integer DEFAULT 0,
	"cards_dismissed" integer DEFAULT 0,
	"cards_snoozed" integer DEFAULT 0,
	"cards_drawn" integer DEFAULT 0,
	"new_context_groups_added" integer DEFAULT 0,
	CONSTRAINT "translation_drill_daily_stats_user_id_language_id_date_pk" PRIMARY KEY("user_id","language_id","date")
);
--> statement-breakpoint
CREATE TABLE "translation_drill_draw_piles" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"group_id" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"draw_pile_name" text,
	"pile_size_limit" integer DEFAULT 10,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "translation_drill_draw_piles_user_id_language_id_group_id_pk" PRIMARY KEY("user_id","language_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "translation_drill_srs" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"card_id" text NOT NULL,
	"next_due" integer DEFAULT 0 NOT NULL,
	"interval_days" integer DEFAULT 1,
	"usage_count" integer DEFAULT 0,
	"last_used" integer,
	"performance_score" real,
	"metadata" jsonb,
	CONSTRAINT "translation_drill_srs_user_id_language_id_card_id_pk" PRIMARY KEY("user_id","language_id","card_id")
);
--> statement-breakpoint
ALTER TABLE "card_groups" ADD CONSTRAINT "card_groups_user_id_language_id_card_id_group_id_pk" PRIMARY KEY("user_id","language_id","card_id","group_id");--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_language_id_card_id_pk" PRIMARY KEY("user_id","language_id","card_id");--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_user_id_language_id_group_id_pk" PRIMARY KEY("user_id","language_id","group_id");--> statement-breakpoint
ALTER TABLE "study_languages" ADD CONSTRAINT "study_languages_user_id_language_id_pk" PRIMARY KEY("user_id","language_id");--> statement-breakpoint
CREATE INDEX "idx_card_entry_stats_date" ON "card_entry_daily_stats" USING btree ("user_id","language_id","date");--> statement-breakpoint
CREATE INDEX "idx_inbox_state" ON "inbox_notes" USING btree ("user_id","language_id","state","created_at");--> statement-breakpoint
CREATE INDEX "idx_inbox_source" ON "inbox_notes" USING btree ("user_id","language_id","source_type");--> statement-breakpoint
CREATE INDEX "idx_note_card_links_note" ON "note_card_links" USING btree ("user_id","language_id","note_id");--> statement-breakpoint
CREATE INDEX "idx_note_card_links_card" ON "note_card_links" USING btree ("user_id","language_id","card_id");--> statement-breakpoint
CREATE INDEX "idx_card_review_stats_date" ON "card_review_daily_stats" USING btree ("user_id","language_id","date");--> statement-breakpoint
CREATE INDEX "idx_card_review_srs_due" ON "card_review_srs" USING btree ("user_id","language_id","next_due");--> statement-breakpoint
CREATE INDEX "idx_card_review_srs_interval" ON "card_review_srs" USING btree ("user_id","language_id","interval_days");--> statement-breakpoint
CREATE INDEX "idx_translation_context_state" ON "translation_drill_context" USING btree ("user_id","language_id","state");--> statement-breakpoint
CREATE INDEX "idx_translation_context_added" ON "translation_drill_context" USING btree ("user_id","language_id","added_at");--> statement-breakpoint
CREATE INDEX "idx_translation_context_rotation" ON "translation_drill_context" USING btree ("user_id","language_id","state","last_used");--> statement-breakpoint
CREATE INDEX "idx_translation_drill_stats_date" ON "translation_drill_daily_stats" USING btree ("user_id","language_id","date");--> statement-breakpoint
CREATE INDEX "idx_draw_piles_enabled" ON "translation_drill_draw_piles" USING btree ("user_id","language_id","enabled");--> statement-breakpoint
CREATE INDEX "idx_translation_drill_srs_due" ON "translation_drill_srs" USING btree ("user_id","language_id","next_due");--> statement-breakpoint
CREATE INDEX "idx_cards_fulltext" ON "cards" USING gin (to_tsvector('english', "content" || ' ' || COALESCE("meaning", '') || ' ' || COALESCE("examples"::text, '')));--> statement-breakpoint
CREATE INDEX "idx_cards_fulltext_simple" ON "cards" USING gin (to_tsvector('simple', "content" || ' ' || COALESCE("meaning", '') || ' ' || COALESCE("examples"::text, '')));