# Database Schema Design

## Status: Complete ✅
**Last Updated**: December 21, 2025  
**Final Schema**: Available in [database-schema-draft.sql](database-schema-draft.sql)

## Design Outcome Summary

This document captured the complete database schema design process for StudyPuck. The final schema implements a multi-application architecture with independent SRS systems and flexible JSON metadata.

### Key Architectural Decisions Made

1. **Multi-Application SRS Independence**: Separate `card_review_srs` and `translation_drill_srs` tables
2. **Partitioned Data Model**: All tables partitioned by `(user_id, language_id)`
3. **JSON Flexibility**: Simplified card structure with JSON arrays for examples/mnemonics
4. **Full-Text Search**: FTS5 integration with automatic synchronization
5. **Translation Context Management**: Dedicated tables for active context and draw pile configuration

## Final Schema Highlights

- **Core Entities**: Users, study_languages, cards, groups, card_groups
- **Card Review App**: card_review_srs with next_due, interval_days, ease_factor
- **Translation Drill App**: translation_drill_srs, translation_drill_context, translation_drill_draw_piles
- **Inbox Processing**: Simple inbox_notes table for capture workflow
- **Performance Optimizations**: Strategic indexing and views for common queries

## Design Process Record

### ✅ Section 0: Preparation (Complete)
- **Functional Requirements Reviewed**: Cards, Card Review, Translation Drills, Core Application Structure
- **Technology Constraints Established**: Neon Postgres with pgvector, advanced full-text search, ACID transactions

### ✅ Section 1-5: Complete Schema Design (Complete)
All sections were completed through iterative discussion and analysis:

1. **Entity Relationship Analysis**: Identified core entities and multi-application independence
2. **Query Pattern Analysis**: Mapped functional requirements to database operations
3. **Table Design with SQL DDL**: Complete CREATE TABLE statements and constraints
4. **Performance Optimization**: Strategic indexing and view definitions
5. **Validation & Testing**: Real-world scenario verification

### Key Design Insights Discovered
- **JSON Simplification**: Eliminated separate tables for card examples/mnemonics 
- **Multi-App Independence**: Clean SRS separation while sharing core entities
- **Partitioning Strategy**: User+language isolation for security and performance
- **Index Strategy**: Focused on high-frequency SRS and context queries

### 📋 Future Implementation Considerations
- **Testing Strategy**: Modern test database spawning for Neon Postgres
- **Migration Tooling**: Schema evolution procedures  
- **Performance Monitoring**: Query optimization in production

## References

- **Final Schema**: [database-schema-draft.sql](database-schema-draft.sql)
- **Query Analysis**: [query-analysis.md](query-analysis.md)
- **Requirements**: Located in `docs/requirements/` directory
- **Rationale**: Complete isolation between users and between languages within user
- **Database Impact**: All tables follow pattern (user_id, language_id, ...) for primary keys and queries
- **Query Implications**: All queries naturally scoped by user+language, preventing cross-contamination

### Multi-Application SRS Architecture  
- **Principle**: Each mini-application (Card Review, Translation Drills) maintains independent SRS metadata
- **Decision**: Vertical separation with separate SRS tables per application (NOT shared table with discriminator)
- **Rationale**: Enables independent app evolution and separate algorithm development
- **Implication**: Same card can have different review schedules across applications
- **Database Impact**: `card_review_srs`, `translation_drill_srs`, etc. as separate tables

### Schema Design Philosophy Per Application
- **Principle**: Hybrid approach - relational core with JSON flexibility where beneficial
- **Decision**: Core entities (users, cards, groups) remain normalized; SRS metadata uses JSON blobs with key fields extracted
- **Rationale**: Leverages PostgreSQL JSONB support while maintaining query performance and schema evolution flexibility
- **Database Impact**: Critical query fields as columns, evolving metadata as JSON

### Card-Centric Data Model
- **Principle**: Cards are read-only shared resources consumed by applications
- **Implication**: Applications don't modify card content, only their own metadata
- **Database Impact**: Clear separation between card data and application-specific data

### Hierarchical Organization
- **Principle**: User → StudyLanguage → Cards/Groups structure
- **Implication**: Data isolation by user and language
- **Database Impact**: Multi-level foreign key relationships and scoping

### Database Operations & Testing Requirements
- **Principle**: Robust testing strategy from project start
- **Implication**: Need modern test database spawning and integration testing patterns
- **Database Impact**: Schema migration strategy and test data management

### Schema Migration Strategy
- **Principle**: Forward-compatible database evolution
- **Implication**: Versioned schema changes with rollback capability
- **Database Impact**: Migration tooling integration with Neon Postgres and Drizzle ORM

## Next Session Action Plan

1. **Start Section 1**: Entity Relationship Analysis
2. **Identify core entities** from functional requirements
3. **Define relationships** between entities
4. **Resolve architectural questions** about SRS independence
5. **Document decisions** and proceed to Section 2

**Estimated time per section**: 15-30 minutes of focused analysis
