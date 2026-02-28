CREATE VIEW "translation_active_cards" AS
SELECT
    c.user_id,
    c.language_id,
    c.card_id,
    c.content,
    c.meaning,
    c.llm_instructions,
    tc.added_from,
    tc.added_at
FROM cards c
JOIN translation_drill_context tc ON (
    c.user_id = tc.user_id AND
    c.language_id = tc.language_id AND
    c.card_id = tc.card_id
)
WHERE c.status = 'active' AND tc.state = 'active';
--> statement-breakpoint
CREATE VIEW "card_review_due" AS
SELECT
    c.user_id,
    c.language_id,
    c.card_id,
    c.content,
    c.meaning,
    c.examples,
    c.mnemonics,
    s.next_due,
    s.interval_days
FROM cards c
JOIN card_review_srs s ON (
    c.user_id = s.user_id AND
    c.language_id = s.language_id AND
    c.card_id = s.card_id
)
WHERE c.status = 'active' AND s.next_due <= EXTRACT(EPOCH FROM NOW());
