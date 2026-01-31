-- StudyPuck Database Schema Draft
-- Status: Simplified - JSON Arrays for Card Components, Card Status Field Added
-- Updated: January 31, 2026  
-- Changes: Added status field to cards table for draft/active workflow

-- Design Principles Applied:
--
-- Data Partitioning:
-- - All tables partitioned by (user_id, language_id) as primary isolation
-- - Every query naturally scoped to user+language preventing cross-contamination
--
-- Vertical Application Separation:
-- - Separate SRS tables per application: card_review_srs, translation_drill_srs
-- - Independent schema evolution per mini-application
-- - Shared core entities: users, cards, groups
--
-- Query-Driven Design:
-- - Optimized for identified high-frequency query patterns
-- - Normalized tables where individual operations needed
-- - JSON metadata where flexibility required

-- ============================================================================
-- CORE ENTITY TABLES
-- ============================================================================

-- Users
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    metadata TEXT -- JSON: preferences, settings, etc.
);

CREATE INDEX idx_users_email ON users(email);

-- Study Languages
CREATE TABLE study_languages (
    user_id TEXT NOT NULL,
    language_id TEXT NOT NULL, -- ISO language code (en, zh, fr, etc.)
    language_name TEXT NOT NULL, -- Display name
    is_active INTEGER DEFAULT 1,
    cefr_level TEXT DEFAULT 'A1' CHECK(cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    settings TEXT, -- JSON: language-specific settings
    PRIMARY KEY (user_id, language_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Groups
CREATE TABLE groups (
    user_id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    group_id TEXT NOT NULL, -- user-defined ID
    group_name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    metadata TEXT, -- JSON: group settings, color, etc.
    PRIMARY KEY (user_id, language_id, group_id),
    FOREIGN KEY (user_id, language_id) REFERENCES study_languages(user_id, language_id)
);

-- Cards (Core Shared Entity) - SIMPLIFIED
CREATE TABLE cards (
    user_id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    card_id TEXT NOT NULL, -- UUID or user-friendly ID
    content TEXT NOT NULL, -- Main study prompt
    status TEXT DEFAULT 'active' CHECK(status IN ('draft', 'active', 'archived', 'deleted')), -- Card lifecycle state
    card_type TEXT DEFAULT 'word' CHECK(card_type IN ('word', 'pattern', 'complex_prompt')),
    meaning TEXT,
    examples TEXT, -- JSON array: [{"text": "这次旅行是一次特别的经历", "translation": "This trip was a special experience"}, ...]
    mnemonics TEXT, -- JSON array: ["Go through here and experience something nice inside", "Another mnemonic", ...]
    llm_instructions TEXT, -- Instructions for AI features
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    metadata TEXT, -- JSON: additional flexible data
    PRIMARY KEY (user_id, language_id, card_id),
    FOREIGN KEY (user_id, language_id) REFERENCES study_languages(user_id, language_id)
);

-- Status field enables draft/active workflow:
-- - 'draft': Card exists but not visible in Card Review/Translation Drill
-- - 'active': Card is live and appears in all applications (default for existing data)  
-- - 'archived': Card is hidden but preserved for potential restoration
-- - 'deleted': Card is soft-deleted, hidden from normal views

-- Full-text search on card content (with automatic sync)
CREATE VIRTUAL TABLE cards_fts USING fts5(
    user_id UNINDEXED,
    language_id UNINDEXED, 
    card_id UNINDEXED,
    content,
    meaning,
    examples, -- Include examples in full-text search
    content='cards',
    content_rowid='rowid'
);

-- Automatic FTS synchronization triggers
CREATE TRIGGER cards_fts_insert AFTER INSERT ON cards BEGIN
    INSERT INTO cards_fts(rowid, user_id, language_id, card_id, content, meaning, examples) 
    VALUES (new.rowid, new.user_id, new.language_id, new.card_id, new.content, new.meaning, new.examples);
END;

CREATE TRIGGER cards_fts_delete AFTER DELETE ON cards BEGIN
    INSERT INTO cards_fts(cards_fts, rowid, user_id, language_id, card_id, content, meaning, examples) 
    VALUES('delete', old.rowid, old.user_id, old.language_id, old.card_id, old.content, old.meaning, old.examples);
END;

CREATE TRIGGER cards_fts_update AFTER UPDATE ON cards BEGIN
    INSERT INTO cards_fts(cards_fts, rowid, user_id, language_id, card_id, content, meaning, examples) 
    VALUES('delete', old.rowid, old.user_id, old.language_id, old.card_id, old.content, old.meaning, old.examples);
    INSERT INTO cards_fts(rowid, user_id, language_id, card_id, content, meaning, examples) 
    VALUES (new.rowid, new.user_id, new.language_id, new.card_id, new.content, new.meaning, new.examples);
END;

CREATE INDEX idx_cards_status_type ON cards(user_id, language_id, status, card_type);
CREATE INDEX idx_cards_status_updated ON cards(user_id, language_id, status, updated_at);
CREATE INDEX idx_cards_active_type ON cards(user_id, language_id, card_type) WHERE status = 'active';
CREATE INDEX idx_cards_active_updated ON cards(user_id, language_id, updated_at) WHERE status = 'active';

-- Card Groups (Many-to-Many)
CREATE TABLE card_groups (
    user_id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    assigned_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user_id, language_id, card_id, group_id),
    FOREIGN KEY (user_id, language_id, card_id) REFERENCES cards(user_id, language_id, card_id),
    FOREIGN KEY (user_id, language_id, group_id) REFERENCES groups(user_id, language_id, group_id)
);

CREATE INDEX idx_card_groups_by_group ON card_groups(user_id, language_id, group_id);
CREATE INDEX idx_card_groups_by_card ON card_groups(user_id, language_id, card_id);



-- ============================================================================
-- CARD ENTRY APPLICATION TABLES
-- ============================================================================

-- Inbox Notes (Simplified - Discard After Processing)
CREATE TABLE inbox_notes (
    user_id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    note_id TEXT NOT NULL, -- UUID
    content TEXT NOT NULL,
    state TEXT DEFAULT 'unprocessed' CHECK(state IN ('unprocessed', 'deferred', 'deleted')),
    source_type TEXT DEFAULT 'manual' CHECK(source_type IN ('manual', 'api', 'browser_extension', 'ifttt', 'zapier', 'n8n')),
    source_metadata TEXT, -- JSON: URL, browser context, integration details
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user_id, language_id, note_id),
    FOREIGN KEY (user_id, language_id) REFERENCES study_languages(user_id, language_id)
);

CREATE INDEX idx_inbox_state ON inbox_notes(user_id, language_id, state, created_at);
CREATE INDEX idx_inbox_source ON inbox_notes(user_id, language_id, source_type);

-- Note-Card Relationships (For Draft Card Workflow)
CREATE TABLE note_card_links (
    user_id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    note_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user_id, language_id, note_id, card_id),
    FOREIGN KEY (user_id, language_id, note_id) REFERENCES inbox_notes(user_id, language_id, note_id),
    FOREIGN KEY (user_id, language_id, card_id) REFERENCES cards(user_id, language_id, card_id)
);

CREATE INDEX idx_note_card_links_note ON note_card_links(user_id, language_id, note_id);
CREATE INDEX idx_note_card_links_card ON note_card_links(user_id, language_id, card_id);

-- Processing workflow with draft cards:
-- 1. Notes processed → draft cards created in cards table → note-card links established  
-- 2. Users review draft cards with note context visible
-- 3. Draft cards promoted to active status → note optionally deleted
-- 4. Links maintained until note deletion for full traceability

-- ============================================================================
-- CARD REVIEW APPLICATION TABLES
-- ============================================================================

-- Card Review SRS
CREATE TABLE card_review_srs (
    user_id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    next_due INTEGER NOT NULL DEFAULT 0, -- epoch timestamp
    interval_days INTEGER DEFAULT 1,
    ease_factor REAL DEFAULT 2.5,
    review_count INTEGER DEFAULT 0,
    last_reviewed INTEGER,
    metadata TEXT, -- JSON: algorithm-specific data, performance history
    PRIMARY KEY (user_id, language_id, card_id),
    FOREIGN KEY (user_id, language_id, card_id) REFERENCES cards(user_id, language_id, card_id)
);

-- Critical index for SRS queries
CREATE INDEX idx_card_review_srs_due ON card_review_srs(user_id, language_id, next_due);
CREATE INDEX idx_card_review_srs_interval ON card_review_srs(user_id, language_id, interval_days);

-- ============================================================================
-- TRANSLATION DRILL APPLICATION TABLES
-- ============================================================================

-- Translation Drill SRS (Independent)
CREATE TABLE translation_drill_srs (
    user_id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    next_due INTEGER NOT NULL DEFAULT 0, -- epoch timestamp
    interval_days INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    last_used INTEGER,
    performance_score REAL, -- success rate in translation context
    metadata TEXT, -- JSON: algorithm-specific data, dismissal history
    PRIMARY KEY (user_id, language_id, card_id),
    FOREIGN KEY (user_id, language_id, card_id) REFERENCES cards(user_id, language_id, card_id)
);

CREATE INDEX idx_translation_drill_srs_due ON translation_drill_srs(user_id, language_id, next_due);

-- Translation Drill Draw Pile Configuration
CREATE TABLE translation_drill_draw_piles (
    user_id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    draw_pile_name TEXT, -- optional custom display name
    pile_size_limit INTEGER DEFAULT 10, -- max cards to draw from this pile
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user_id, language_id, group_id),
    FOREIGN KEY (user_id, language_id, group_id) REFERENCES groups(user_id, language_id, group_id)
);

CREATE INDEX idx_draw_piles_enabled ON translation_drill_draw_piles(user_id, language_id, enabled);

-- Translation Drill Active Context
CREATE TABLE translation_drill_context (
    user_id TEXT NOT NULL,
    language_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active', 'snoozed', 'dismissed')),
    added_from TEXT, -- 'draw_pile:group_id', 'pinned_from_review'
    added_at INTEGER DEFAULT (strftime('%s', 'now')),
    last_used INTEGER, -- timestamp of most recent selection for sentence generation
    usage_count INTEGER DEFAULT 0, -- total times selected for sentence generation
    state_until INTEGER, -- timestamp for snooze/dismiss duration
    cefr_override TEXT CHECK(cefr_override IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')), -- optional drill-level CEFR override
    metadata TEXT, -- JSON: context-specific data
    PRIMARY KEY (user_id, language_id, card_id),
    FOREIGN KEY (user_id, language_id, card_id) REFERENCES cards(user_id, language_id, card_id)
);

CREATE INDEX idx_translation_context_state ON translation_drill_context(user_id, language_id, state);
CREATE INDEX idx_translation_context_added ON translation_drill_context(user_id, language_id, added_at);
CREATE INDEX idx_translation_context_rotation ON translation_drill_context(user_id, language_id, state, last_used);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active Cards for Translation Context
CREATE VIEW translation_active_cards AS
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

-- Cards Due for Review
CREATE VIEW card_review_due AS
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
WHERE c.status = 'active' AND s.next_due <= strftime('%s', 'now');

-- ============================================================================
-- TRIGGERS FOR DATA INTEGRITY
-- ============================================================================

-- Update cards.updated_at on modification
CREATE TRIGGER tr_cards_updated_at 
    AFTER UPDATE ON cards
BEGIN
    UPDATE cards 
    SET updated_at = strftime('%s', 'now') 
    WHERE user_id = NEW.user_id 
      AND language_id = NEW.language_id 
      AND card_id = NEW.card_id;
END;

-- ============================================================================
-- PERFORMANCE CONSIDERATIONS
-- ============================================================================

-- Primary Query Optimization:
-- 1. Card Review SRS queries: (user_id, language_id, next_due) index
-- 2. Translation context retrieval: (user_id, language_id, state) index  
-- 3. Group-based filtering: (user_id, language_id, group_id) index
-- 4. Full-text search: FTS5 virtual table for card content

-- Potential Scaling Bottlenecks:
-- 1. Card-group many-to-many: May need optimization if users have thousands of cards
-- 2. SRS updates: High frequency individual updates - consider WAL mode
-- 3. Translation context queries: Should remain fast due to small context sizes
-- 4. JSON extraction: Neon Postgres's JSON functions are optimized but consider generated columns for heavy queries

-- Notes for Review:
-- 1. Simplified card content: Examples/mnemonics as JSON arrays eliminate complex triggers
-- 2. JSON metadata fields: Positioned for algorithm evolution, may need schema migration strategy
-- 3. FTS5 integration: Now includes examples content for richer search
-- 4. Atomic card operations: Single-table read/write for complete card data

-- ============================================================================
-- EXAMPLE JSON STRUCTURES
-- ============================================================================

-- examples field JSON structure:
-- [
--   {
--     "text": "这次旅行是一次特别的经历。",
--     "translation": "This trip was a special experience."
--   },
--   {
--     "text": "他有很多工作经历。",
--     "translation": "He has a lot of work experience."
--   }
-- ]

-- mnemonics field JSON structure:
-- [
--   "Go through here and experience something nice inside, which might not be legal!",
--   "经历 sounds like 'jing-li' = experience you go through"
-- ]

-- Query examples for JSON fields:
-- SELECT examples ->> '$[0].text' FROM cards WHERE card_id = ?;  -- First example text
-- SELECT json_array_length(examples) FROM cards WHERE card_id = ?;  -- Count examples
-- SELECT * FROM cards WHERE examples LIKE '%旅行%';  -- Search within examples

-- Query examples for status field:
-- SELECT * FROM cards WHERE user_id = ? AND language_id = ? AND status = 'active';  -- Active cards only
-- SELECT * FROM cards WHERE user_id = ? AND language_id = ? AND status = 'draft';   -- Draft cards only
-- UPDATE cards SET status = 'active' WHERE user_id = ? AND language_id = ? AND card_id = ?;  -- Promote draft to active

-- Query examples for note-card relationships:
-- SELECT c.*, n.content as note_content FROM cards c JOIN note_card_links l ON (c.user_id = l.user_id AND c.language_id = l.language_id AND c.card_id = l.card_id) JOIN inbox_notes n ON (l.user_id = n.user_id AND l.language_id = n.language_id AND l.note_id = n.note_id) WHERE c.user_id = ? AND c.language_id = ? AND c.status = 'draft';  -- Draft cards with their source notes
-- SELECT card_id FROM note_card_links WHERE user_id = ? AND language_id = ? AND note_id = ?;  -- All cards created from a note
