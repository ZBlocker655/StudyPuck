DROP INDEX IF EXISTS "idx_cards_fulltext";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_cards_fulltext_simple";--> statement-breakpoint
CREATE INDEX "idx_cards_fulltext" ON "cards" USING gin (to_tsvector('english', "content" || ' ' || COALESCE("meaning", '') || ' ' || COALESCE("examples"::text, '') || ' ' || COALESCE("mnemonics"::text, '')));--> statement-breakpoint
CREATE INDEX "idx_cards_fulltext_simple" ON "cards" USING gin (to_tsvector('simple', "content" || ' ' || COALESCE("meaning", '') || ' ' || COALESCE("examples"::text, '') || ' ' || COALESCE("mnemonics"::text, '')));
