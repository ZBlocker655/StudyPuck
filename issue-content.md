# Add Application-Specific Statistics Tables - Requirements & Schema Update

## Summary
Update requirements documentation and database schema to include statistics tracking tables for each mini-application to enable Anki-style usage analytics and progress visualization.

**SCOPE**: This issue is for documentation and schema design only. No application implementation.

## Background
StudyPuck follows a multi-application architecture where each mini-application (Card Entry, Card Review, Translation Drills) operates independently. To support user progress tracking and motivation features similar to Anki's statistics, we need to document the requirements and update the schema design to include application-specific statistics tables that track daily usage metrics.

## Requirements

### Database Schema Changes
Add three new daily statistics tables following the established pattern of application separation:

#### Card Entry Daily Statistics
```sql
CREATE TABLE card_entry_daily_stats (
  user_id TEXT,
  language_id TEXT,
  date DATE,
  -- Inbox activity
  notes_captured INTEGER DEFAULT 0,
  notes_processed INTEGER DEFAULT 0,
  notes_deferred INTEGER DEFAULT 0,
  notes_deleted INTEGER DEFAULT 0,
  -- Card creation
  draft_cards_created INTEGER DEFAULT 0,
  cards_promoted_to_active INTEGER DEFAULT 0,
  groups_created INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, language_id, date)
);
```

#### Card Review Daily Statistics  
```sql
CREATE TABLE card_review_daily_stats (
  user_id TEXT,
  language_id TEXT,
  date DATE,
  -- Review session metrics
  cards_reviewed INTEGER DEFAULT 0,
  total_review_time_minutes INTEGER DEFAULT 0,
  -- Performance metrics
  cards_rated_easy INTEGER DEFAULT 0,
  cards_rated_medium INTEGER DEFAULT 0,
  cards_rated_hard INTEGER DEFAULT 0,
  cards_snoozed INTEGER DEFAULT 0,
  cards_disabled INTEGER DEFAULT 0,
  -- Cross-app actions
  cards_pinned_to_drills INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, language_id, date)
);
```

#### Translation Drills Daily Statistics
```sql
CREATE TABLE translation_drill_daily_stats (
  user_id TEXT,
  language_id TEXT,
  date DATE,
  -- Session metrics
  sentences_translated INTEGER DEFAULT 0,
  total_session_time_minutes INTEGER DEFAULT 0,
  -- Context management
  cards_dismissed INTEGER DEFAULT 0,
  cards_snoozed INTEGER DEFAULT 0,
  cards_drawn INTEGER DEFAULT 0,
  new_context_groups_added INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, language_id, date)
);
```

### Implementation Approach
- **Hybrid approach**: Maintain current snapshot-based architecture while adding lightweight daily aggregation
- **Real-time updates**: Increment statistics during user actions (e.g., when reviewing a card, increment `cards_reviewed`)
- **Daily rollup pattern**: Use `INSERT ... ON CONFLICT DO UPDATE` to maintain daily totals
- **Partitioned by user/language**: Follow established data isolation patterns

### Statistics Capabilities Enabled
- **Progress tracking**: Daily activity charts showing study consistency
- **Performance trends**: Success rates and efficiency metrics over time  
- **Cross-application comparison**: Compare learning progress across different study methods
- **Motivational features**: Streak tracking and goal progress
- **Usage analytics**: Understanding which features drive learning outcomes

## Acceptance Criteria
- [ ] Requirements documentation updated with statistics capabilities
- [ ] Database schema draft updated with statistics tables  
- [ ] Statistics tables follow established user/language partitioning patterns
- [ ] Schema includes proper constraints and indexes for statistics queries
- [ ] Documentation clearly describes the hybrid approach (snapshot + daily aggregation)
- [ ] Requirements specify real-time statistics updates during user actions

## Deliverables
- Updated `docs/requirements/functionality/usage-statistics.md` 
- Updated `docs/requirements/overview/core-application-structure.md`
- Updated `docs/specs/database-schema-draft.sql` with statistics tables
- No application code or implementation

## Implementation Notes
- Start with basic statistics infrastructure
- Tables can be extended with additional metrics in future iterations
- Follow established patterns for user/language data isolation
- Consider adding basic API endpoints for statistics retrieval

## Related Documentation
- Database schema: `docs/specs/database-schema-design.md`
- Multi-application architecture: `AGENTS.md`