# ADR-005: Database Connection Strategy

**Date:** 2026-02-02  
**Status:** Accepted  
**Deciders:** @ZBlocker655  
**Technical Story:** [GitHub Issue #21](https://github.com/ZBlocker655/StudyPuck/issues/21) - Database setup and environment configuration

## Context and Problem Statement

Neon Postgres provides two types of database connections: direct connections and pooled connections (via PgBouncer). During database setup, we discovered compatibility issues between pooled connections and Drizzle Kit migration tracking. We needed to determine the optimal connection strategy for different use cases (migrations, application runtime) while balancing performance, reliability, and configuration complexity.

## Decision Drivers

* **Migration Reliability**: Database migrations must work consistently and track properly
* **Application Performance**: Runtime queries should be fast and handle concurrent users
* **Configuration Simplicity**: Minimize environment variable complexity across all deployment environments
* **Cloudflare Workers Compatibility**: Must work reliably in serverless edge environment
* **Development Experience**: Easy local development and testing workflows
* **Cost Optimization**: Efficient use of database connections and resources

## Considered Options

* **Option 1**: Single Direct Connection (for both migrations and runtime)
* **Option 2**: Dual Connections (direct for migrations, pooled for runtime)
* **Option 3**: Single Pooled Connection (with migration workarounds)

## Decision Outcome

**Chosen option:** **Single Direct Connection**, because it provides reliable migration tracking, sufficient performance for current application scale, simplifies configuration management, and can be upgraded to dual connections later if performance demands require it.

### Positive Consequences

* **Migration Reliability**: Direct connections work consistently with Drizzle Kit migration tracking
* **Configuration Simplicity**: Single `DATABASE_URL` environment variable across all environments
* **Development Workflow**: Same connection type for local development and production
* **No Runtime Issues**: Direct connections handle typical web application load efficiently
* **Easy Upgrade Path**: Can add pooled connections later without breaking changes

### Negative Consequences

* **Potential Performance Limitation**: Direct connections may be slower under very high concurrent load
* **Connection Limits**: May hit connection limits sooner than with pooled connections
* **Less Optimized**: Not taking advantage of connection pooling benefits for runtime queries

## Pros and Cons of the Options

### Option 1: Single Direct Connection ✅

* Good, because migrations work reliably with proper tracking
* Good, because single environment variable simplifies configuration
* Good, because same behavior in all environments (local, CI, production)
* Good, because adequate performance for current application scale
* Good, because can upgrade to dual connections later if needed
* Bad, because may not be optimal for high-concurrency scenarios
* Bad, because not taking advantage of pooling benefits

### Option 2: Dual Connections (Direct + Pooled)

* Good, because optimal performance for both use cases
* Good, because migrations work reliably with direct connection
* Good, because runtime queries benefit from connection pooling
* Bad, because doubles configuration complexity (two connection strings)
* Bad, because requires application code changes to use different connections
* Bad, because more environment variables to manage across all platforms
* Bad, because potential for configuration errors between environments

### Option 3: Single Pooled Connection

* Good, because optimal runtime performance with connection pooling
* Good, because single environment variable
* Bad, because migration tracking issues with Drizzle Kit + pooled connections
* Bad, because unreliable migration behavior discovered during testing
* Bad, because requires workarounds or acceptance of broken migration tracking

## Technical Details

### Migration Tracking Issue Discovery

During implementation of Issue #21, we discovered that pooled connections (`-pooler` hostnames) prevent Drizzle Kit from properly creating and maintaining the `__drizzle_migrations` tracking table. This was confirmed through extensive testing:

```bash
# Pooled connection (problematic for migrations)
DATABASE_URL="postgresql://user:pass@ep-branch-pooler.neon.tech/db"
pnpm migrate  # Creates tables but no migration tracking

# Direct connection (works correctly)  
DATABASE_URL="postgresql://user:pass@ep-branch.neon.tech/db"
pnpm migrate  # Creates tables AND migration tracking
```

### Performance Analysis

**Direct Connection Performance:**
- ✅ Suitable for applications with < 100 concurrent users
- ✅ Handles typical CRUD operations efficiently
- ✅ No connection setup overhead for individual requests
- ⚠️ May hit connection limits under sustained high load

**Current Application Profile:**
- **User Scale**: Hobby project targeting < 1000 total users
- **Concurrent Users**: Expected < 50 simultaneous active users
- **Query Pattern**: Typical CRUD operations for language learning cards
- **Performance Requirement**: Sub-500ms response times for API endpoints

**Verdict**: Direct connections are adequate for foreseeable application needs.

### Environment Configuration

**Single Connection String Format:**
```bash
# Development
DATABASE_URL="postgresql://user:pass@ep-development.neon.tech/db"

# Production  
DATABASE_URL="postgresql://user:pass@ep-production.neon.tech/db"

# Feature Branches
DATABASE_URL="postgresql://user:pass@ep-feature-xyz.neon.tech/db"
```

**Key Characteristics:**
- No `-pooler` in hostname = direct connection
- Same format across all environments
- Works for both migrations and application runtime

## Future Migration Path

If application growth requires connection pooling:

### Upgrade to Dual Connections
```bash
# Keep direct for migrations
MIGRATION_DATABASE_URL="postgresql://user:pass@ep-production.neon.tech/db"

# Add pooled for runtime  
DATABASE_URL="postgresql://user:pass@ep-production-pooler.neon.tech/db"
```

### Application Code Changes
```typescript
// Use different connections for different purposes
import { migrationDb, runtimeDb } from './db-config';

// Migrations (use migrationDb)
await migrate(migrationDb, { migrationsFolder: './migrations' });

// Application queries (use runtimeDb)  
const users = await runtimeDb.select().from(usersTable);
```

### Migration Trigger
Consider upgrading when:
- **Concurrent users** consistently exceed 100
- **Response times** degrade due to connection contention
- **Connection limits** are frequently approached
- **Database monitoring** shows connection pool benefits

## Links

* [GitHub Issue #21: Database Setup Implementation](https://github.com/ZBlocker655/StudyPuck/issues/21)
* [Database Branching Guide](../../ops/database-branching-guide.md)
* [Environment Setup Guide](../../ops/environment-setup.md)
* [ADR-004: Neon Postgres Decision](./004-database-neon-postgres.md)
* [Neon Connection Documentation](https://neon.tech/docs/connect/connectivity-issues)

## Research Notes

* **Drizzle Kit Version**: 0.31.8 - confirmed migration tracking issues with pooled connections
* **Testing Environment**: Neon development branch with both direct and pooled URLs
* **Compatibility**: Verified with @neondatabase/serverless 0.10.4
* **Performance Impact**: No significant performance degradation observed with direct connections for current use case