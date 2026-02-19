CREATE TABLE "card_groups" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"card_id" text NOT NULL,
	"group_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"card_id" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'active',
	"card_type" text DEFAULT 'word',
	"meaning" text,
	"examples" jsonb,
	"mnemonics" jsonb,
	"llm_instructions" text,
	"embedding" vector(768),
	"embedding_model" text,
	"embedding_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"group_id" text NOT NULL,
	"group_name" text NOT NULL,
	"description" text,
	"embedding" vector(768),
	"embedding_model" text,
	"embedding_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "study_languages" (
	"user_id" text NOT NULL,
	"language_id" text NOT NULL,
	"language_name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"cefr_level" text DEFAULT 'A1',
	"created_at" timestamp with time zone DEFAULT now(),
	"settings" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "idx_card_groups_by_group" ON "card_groups" USING btree ("user_id","language_id","group_id");--> statement-breakpoint
CREATE INDEX "idx_card_groups_by_card" ON "card_groups" USING btree ("user_id","language_id","card_id");--> statement-breakpoint
CREATE INDEX "idx_cards_status_type" ON "cards" USING btree ("user_id","language_id","status","card_type");--> statement-breakpoint
CREATE INDEX "idx_cards_status_updated" ON "cards" USING btree ("user_id","language_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_cards_embedding_similarity" ON "cards" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_cards_active_type" ON "cards" USING btree ("user_id","language_id","card_type");--> statement-breakpoint
CREATE INDEX "idx_cards_active_updated" ON "cards" USING btree ("user_id","language_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_groups_embedding_similarity" ON "groups" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");-- Test comment
