# Data Architecture Analysis

## Query Pattern Analysis

### Core Query Types Needed

#### 1. User Data Queries
- Get user profile and settings
- Update user preferences
- User authentication lookup

#### 2. Card Management Queries  
- **Full-text search**: Search card content across languages
- **Hierarchical browsing**: User → Study Language → Cards/Groups
- **Tag-based filtering**: Find cards by tags, difficulty, etc.
- **CRUD operations**: Create, read, update, delete cards

#### 3. Spaced Repetition System (SRS)
- **Due cards query**: Cards due for review by user/language
- **Progress tracking**: Review history, success rates
- **Scheduling calculations**: Next review dates based on performance

#### 4. Study Session Queries
- **Random drill selection**: Pick cards for translation drills
- **Performance analytics**: Progress over time, weak areas
- **Streak tracking**: Daily/weekly study statistics

## Database Architecture Options

### Option 1: Cloudflare D1 (SQLite) - Relational
**Schema approach**:
```sql
Users → StudyLanguages → CardGroups → Cards → Reviews
                      → Tags → CardTags
```

**Pros**:
- Full SQL with joins, indexes
- Built-in full-text search (FTS5)
- ACID transactions
- Familiar relational patterns

**Cons**:
- No vector search (would need external service for RAG)
- SQLite scaling limitations (though adequate for your scale)

### Option 2: Hybrid Cloudflare Approach
- **D1**: Core relational data (users, cards, reviews)
- **KV**: Session data, caching, user preferences
- **Vectorize**: Vector embeddings (if RAG needed)

### Option 3: External Database + Cloudflare
- **Supabase**: PostgreSQL with vector extensions, auth, real-time
- **PlanetScale**: MySQL with branching (though scaling down)
- **Turso**: Edge SQLite with replication

## RAG/Vector Search Assessment

### Do you need RAG/Vector search?
Based on your requirements, **probably not initially**:

**Traditional search suffices for**:
- Finding cards by text content (full-text search)
- Tag-based filtering
- Metadata queries (difficulty, date, etc.)

**Vector search would be useful for**:
- "Find similar cards" recommendations
- Semantic search ("find cards about food" vs exact text match)
- AI-powered study recommendations

**Recommendation**: Start with full-text search, add vector capability later if needed.

## Recommended Architecture

**Updated Decision (January 2026)**: Neon Postgres with pgvector
- **Previous decision**: Cloudflare D1 + KV hybrid approach
- **Reason for change**: Vector search requirements for Card Entry features (Group Suggestions, Duplicate Detection)
- **Benefits**: Unified database for relational + vector data, advanced full-text search, JSON support
- **Cost**: Minimal premium over D1+Vectorize hybrid ($1-2/month)
- **Decision documented in**: GitHub Issue #29

**Architecture**:
- Neon Postgres with pgvector extension for vector similarity search
- Advanced full-text search with multi-language support  
- JSONB for flexible schema evolution
- Database branching for development workflows

**Data hierarchy**:
```
User (D1)
├── StudyLanguage (D1)
│   ├── Cards (D1 with FTS)
│   ├── CardGroups (D1)
│   └── Reviews (D1)
└── UserPreferences (KV)