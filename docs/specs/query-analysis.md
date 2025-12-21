# Query Analysis for StudyPuck Database Design

## Status: In Progress
**Last Updated**: December 19, 2024  
**Current Phase**: Initial query pattern identification from functional requirements

## Overview

This document analyzes actual query patterns needed to support StudyPuck's functional requirements. The goal is to make data-driven decisions about schema design (JSON vs normalized, indexing strategy, etc.) based on real usage patterns rather than theoretical preferences.

## Analysis Methodology

1. **Extract concrete operations** from functional requirements
2. **Categorize by frequency and complexity**
3. **Identify performance-critical patterns**
4. **Map to optimal storage/schema patterns**
5. **Validate schema decisions against query evidence**

## Query Categories Identified

### Card Entry Operations
Based on `docs/requirements/functionality/card-entry.md`:

#### High-Frequency Operations
- **Inbox Item CRUD**:
  - `INSERT INTO inbox_notes (user_id, language_id, content, created_at) VALUES (?, ?, ?, ?)`
  - `SELECT * FROM inbox_notes WHERE user_id=? AND language_id=? ORDER BY created_at DESC`
  - `UPDATE inbox_notes SET state='processed' WHERE user_id=? AND language_id=? AND note_id=?`
  - `DELETE FROM inbox_notes WHERE user_id=? AND language_id=? AND note_id=?`

- **Card Creation from Notes**:
  - `INSERT INTO cards (user_id, language_id, content, groups, ...) VALUES (...)`
  - **Question**: Multiple cards from single note - do we need to track note→card relationships?

#### Medium-Frequency Operations
- **Cross-Language Inbox Switching**:
  - `SELECT * FROM inbox_notes WHERE user_id=? AND language_id=?` (different languages)
  - **Question**: Do users frequently switch between language inboxes in same session?

#### Future AI Enhancement Queries (Low-Frequency Initially)
- **Duplicate Detection**: 
  - `SELECT * FROM cards WHERE user_id=? AND language_id=? AND content LIKE '%keyword%'`
  - **Question**: Full-text search across all user's cards in language needed?
- **Group Suggestion**: 
  - Complex similarity queries across existing cards
  - **Question**: Is this RAG territory or simpler pattern matching?

### Card Review Operations  
Based on `docs/requirements/functionality/card-review.md`:

#### High-Frequency Operations
- **Target Selection & Filtering**:
  - `SELECT COUNT(*) FROM cards c [JOIN card_groups cg ON c.card_id=cg.card_id] WHERE c.user_id=? AND c.language_id=? [AND cg.group_id IN (?)]`
  - **Pattern**: User selects review target (all cards, specific group(s), other filters)
  - **Usage**: Session setup operation

- **SRS-Ordered Card Retrieval** (Critical Performance):
  - `SELECT c.*, s.next_due FROM cards c JOIN card_review_srs s ON c.card_id=s.card_id WHERE c.user_id=? AND c.language_id=? [AND target_filters] ORDER BY s.next_due ASC LIMIT ? OFFSET ?`
  - **Pattern**: Paginated results sorted by SRS priority (next_due timestamp)
  - **Usage**: Primary query for review sessions
  - **Performance Critical**: Must be fast with proper indexing

- **SRS Metadata Updates** (High-Frequency):
  - `UPDATE card_review_srs SET next_due=?, interval_days=?, last_reviewed=?, metadata=? WHERE user_id=? AND language_id=? AND card_id=?`
  - **Pattern**: Individual card updates as user reviews each card
  - **Usage**: After each card review (not batched)

#### Medium-Frequency Operations
- **Group-Based Filtering**:
  - `SELECT c.* FROM cards c JOIN card_groups cg ON c.card_id=cg.card_id JOIN card_review_srs s ON c.card_id=s.card_id WHERE c.user_id=? AND c.language_id=? AND cg.group_id=? ORDER BY s.next_due LIMIT ? OFFSET ?`
  - **Pattern**: Same core query but with group filter applied
  - **Usage**: When user chooses specific group as review target

#### Key Design Implications
- **Pagination Required**: Continuous feed UX with behind-the-scenes pagination for efficiency
- **Flexible Filtering**: Review targets extensible (currently all cards or groups, future filters possible)
- **Multi-Group Selection**: Potential for selecting multiple groups simultaneously as review target
- **SRS Sort Performance**: ORDER BY next_due must be optimized with composite indexes
- **Individual Updates**: No batching - each card review triggers immediate SRS update
- **Cross-App Operations**: "Pin to context", "snooze", "disable" are Translation Drill context operations, not Card Review SRS

### Translation Drill Operations
Based on `docs/requirements/functionality/translation-drills.md`:

#### High-Frequency Operations
- **Context State Management** (Session-heavy):
  - Load current active context: `SELECT * FROM translation_drill_context WHERE user_id=? AND language_id=? AND state='active'`
  - Update card states: `UPDATE translation_drill_context SET state=?, state_until=? WHERE user_id=? AND language_id=? AND card_id=?`
  - **Pattern**: Individual card state transitions (active→snoozed→dismissed)
  - **Usage**: During conversation flow as user manages context

- **Draw Pile Operations** (Medium-High Frequency):
  - SRS-weighted card selection: `SELECT c.card_id FROM cards c LEFT JOIN translation_drill_srs s ON (...) WHERE c.user_id=? AND c.language_id=? AND group_id=? ORDER BY COALESCE(s.next_due, 0) ASC LIMIT 1`
  - Add to context: `INSERT INTO translation_drill_context (user_id, language_id, card_id, state, added_from) VALUES (?, ?, ?, 'active', 'draw_pile')`
  - **Pattern**: SRS-weighted selection to minimize user choice burden
  - **Usage**: User clicks group "draw pile" buttons

- **LLM Context Retrieval** (High-Frequency):
  - `SELECT c.*, c.llm_instructions FROM cards c JOIN translation_drill_context tc ON (...) WHERE tc.user_id=? AND tc.language_id=? AND tc.state='active'`
  - **Pattern**: Active cards fed to LLM for sentence generation
  - **Usage**: Every AI interaction during translation session

#### Cross-Application Operations
- **Card Pin Reception** (Low-Frequency):
  - Receive from Card Review: `INSERT INTO translation_drill_context (...) VALUES (..., 'pinned_from_review')`
  - **Pattern**: Opaque interface - Card Review "sends", Translation Drill "receives" and decides manifestation
  - **Usage**: When user pins card from Card Review interface

#### Key Design Implications
- **Small Active Context**: Dozens of cards maximum, potentially as few as 1-2
- **Individual State Updates**: Single card operations during conversation flow  
- **SRS Integration**: Draw pile selection weighted by next_due dates from Translation Drill SRS
- **User Dismissal Control**: SRS suggests intervals, user chooses or overrides
- **Multi-Group Draw Piles**: Multiple groups can function as draw piles simultaneously
- **Draw Pile Configuration**: User controls which groups are enabled as draw piles
- **Cross-App Interface**: Business logic level integration, not schema level
- **Context Query Performance**: Fast retrieval of active cards for LLM context

#### Additional Schema Requirements
- **Draw Pile Configuration Table**: Track which groups are enabled as draw piles per user+language
- **Dismissal Tracking**: Translation Drill SRS tracks next_due dates independently
- **Multi-Source Context**: Active context cards can come from multiple draw piles + pinned cards

### Cards Core Operations
Based on `docs/requirements/functionality/cards.md`:

#### Medium-Frequency Operations
- **Card Content Management**:
  - Full card CRUD with examples, mnemonics, LLM instructions
  - **Question**: Are examples/mnemonics edited individually or as part of full card updates?

- **Group Membership Management** (Many-to-Many):
  - Add/remove cards from groups
  - **Question**: Bulk group operations or individual card moves?

- **Full-Text Search**:
  - Search across card content within user+language
  - **Question**: Simple keyword search or complex fuzzy matching needed?

## Questions for Clarification

### Performance and Scale Questions
1. **Pagination efficiency**: What's optimal page size for behind-the-scenes queries in continuous feed UX?
2. **Multi-group queries**: Performance implications of `WHERE group_id IN (?, ?, ?)` vs single group filters
3. **Search complexity**: Full-text search needs - simple keywords or semantic similarity?

### Functional Behavior Questions  
4. **Translation context complexity**: How many cards typically active in Translation Drill context simultaneously?
5. **Context state operations**: Are Translation Drill context updates (active→snoozed→dismissed) single-card or bulk operations?
6. **Cross-application data flow**: How do cards move from Card Review "pin to context" into Translation Drill active context?

### Future Enhancement Questions
7. **Analytics scope**: Any user progress analytics across time? Across applications?
8. **AI integration points**: Where would RAG/vector search provide most value?

## Next Steps
1. Get clarification on above questions
2. Map query patterns to storage patterns (JSON vs normalized)
3. Identify indexing requirements
4. Validate schema design against query evidence
