import { pgView } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Active Cards for Translation Context.
 * Joins cards with translation_drill_context to show cards currently in the drill.
 */
export const translationActiveCards = pgView('translation_active_cards').as(sql`
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
  WHERE c.status = 'active' AND tc.state = 'active'
`);

/**
 * Cards Due for Review.
 * Joins cards with card_review_srs to show cards whose next_due is in the past.
 */
export const cardReviewDue = pgView('card_review_due').as(sql`
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
  WHERE c.status = 'active' AND s.next_due <= EXTRACT(EPOCH FROM NOW())
`);
