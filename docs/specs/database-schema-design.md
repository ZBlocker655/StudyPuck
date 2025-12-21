# Database Schema Design

## Status: Ready to Begin
**Last Updated**: December 19, 2024  
**Current Section**: Ready for Section 1 - Entity Relationship Analysis

## Design Process Overview

This document follows a structured 5-section approach to design the complete database schema for StudyPuck, based on functional requirements analysis.

## Section Plan

### ✅ Section 0: Preparation (Complete)
- **Functional Requirements Reviewed**:
  - Cards: Core data layer, multi-type content, flexible grouping
  - Card Review: Independent SRS, browsing interface, card state management
  - Translation Drills: Separate SRS, context management, AI integration
  - Core Application Structure: Multi-language, user-centric organization

- **Technology Constraints Established**:
  - **Database**: Cloudflare D1 (SQLite)
  - **Secondary Storage**: Cloudflare KV for caching/sessions
  - **Key Features Needed**: Full-text search (FTS5), ACID transactions, efficient joins

### 🔄 Section 1: Entity Relationship Analysis (Next)
**Goal**: Identify core entities and their relationships from functional requirements

**Key Questions to Resolve**:
- Primary entities: Users, StudyLanguages, Cards, Groups, Reviews
- How to handle multi-application SRS independence (Card Review vs Translation Drills)
- Card-to-Group relationships (many-to-many)
- User hierarchy: User → StudyLanguage → Cards/Groups
- Note storage: Card-level vs application-specific

**Expected Outputs**:
- Complete entity list with attributes
- Relationship diagram/description
- Architectural decisions on SRS data separation

### 📋 Section 2: Query Pattern Analysis (Pending)
**Goal**: Map functional requirements to specific database operations

**Key Areas**:
- Full-text search scenarios across card content
- SRS "due cards" queries by application and language  
- Hierarchical browsing patterns
- Group-based filtering and subset selection
- Cross-application data sharing (notes, card content)

**Expected Outputs**:
- Detailed query scenarios with expected performance
- Index requirements identification
- Data access patterns by application component

### 📋 Section 3: Table Design with SQL DDL (Pending)
**Goal**: Create actual database schema with proper SQLite syntax

**Key Areas**:
- Table definitions with data types
- Primary/foreign key relationships
- Constraints and validation rules
- Full-text search table setup (FTS5)

**Expected Outputs**:
- Complete CREATE TABLE statements
- Relationship constraints (FOREIGN KEY)
- Initial data migration considerations

### 📋 Section 4: Indexing and Performance Optimization (Pending)
**Goal**: Optimize for identified query patterns

**Key Areas**:
- Index strategy for SRS queries
- Full-text search optimization
- Composite indexes for common query patterns
- Query performance validation

**Expected Outputs**:
- Complete index creation statements
- Performance testing scenarios
- Query optimization recommendations

### 📋 Section 5: Validation Scenarios (Pending)
**Goal**: Test schema against real-world functional requirements

**Key Areas**:
- Multi-application SRS independence verification
- Cross-language data isolation
- Complex query scenario testing
- Data integrity validation

**Expected Outputs**:
- Sample data scenarios
- Test query validations
- Schema refinement recommendations

### 📋 Section 6: Testing Strategy & Database Operations (Added)
**Goal**: Design comprehensive testing approach and database operational procedures

**Key Areas**:
- Modern test database spawning strategies
- Integration testing patterns for Cloudflare D1
- Database schema migration tooling and processes
- CI/CD integration for database operations
- Test data management and cleanup

**Expected Outputs**:
- Testing strategy recommendations
- Migration workflow design
- Test database configuration
- CI/CD pipeline integration plan

## Context Restoration Instructions

**To resume this exploration:**
1. Reference this file for current status and next section
2. Review completed sections for established decisions
3. Begin with Section 1: Entity Relationship Analysis
4. Use functional requirements files as reference:
   - `docs/requirements/functionality/cards.md`
   - `docs/requirements/functionality/card-review.md`
   - `docs/requirements/functionality/translation-drills.md`
   - `docs/requirements/overview/core-application-structure.md`

## Key Architectural Decisions Made

### Data Partitioning Principle
- **Principle**: All data partitioned first by user, then by language
- **Decision**: Every table includes user_id and language_id as primary partitioning keys
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
- **Rationale**: Leverages SQLite JSON support while maintaining query performance and schema evolution flexibility
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
- **Database Impact**: Migration tooling integration with Cloudflare D1

## Next Session Action Plan

1. **Start Section 1**: Entity Relationship Analysis
2. **Identify core entities** from functional requirements
3. **Define relationships** between entities
4. **Resolve architectural questions** about SRS independence
5. **Document decisions** and proceed to Section 2

**Estimated time per section**: 15-30 minutes of focused analysis