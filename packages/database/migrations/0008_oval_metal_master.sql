CREATE TABLE "card_review_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"card_id" text NOT NULL,
	"event_type" text NOT NULL,
	"rating" text,
	"previous_state" text,
	"next_state" text,
	"previous_interval_days" integer,
	"next_interval_days" integer,
	"previous_due" integer,
	"next_due" integer,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "inbox_notes" ALTER COLUMN "ai_state" SET DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE "card_review_srs" ADD COLUMN "state" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "card_review_srs" ADD COLUMN "snoozed_until" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_card_review_events_card_timeline" ON "card_review_events" USING btree ("user_id","language_id","card_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_card_review_events_type" ON "card_review_events" USING btree ("user_id","language_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_card_review_srs_state" ON "card_review_srs" USING btree ("user_id","language_id","state");