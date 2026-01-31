# Database Migration Strategy & Schema Management

## Status: Analysis Complete ✅
**Created**: January 31, 2026  
**Context**: Part of Milestone 1.3 Database Setup planning

## Overview

Analysis of pending database schema management questions discovered during architecture documentation cleanup. This document addresses the remaining implementation questions for Neon Postgres + Drizzle ORM migration workflow.

## Key Questions Identified & Resolved

### Q1: Daily Developer Workflow for Schema Changes
**Question**: What commands do developers run for routine schema modifications?

**Answer - Standard Drizzle Workflow**:
```bash
# 1. Modify schema files in src/lib/db/schema.ts
# 2. Generate migration
pnpm drizzle-kit generate

# 3. Review generated migration in drizzle/ directory
# 4. Apply migration to development database
pnpm drizzle-kit migrate

# 5. Optional: Push direct schema changes (development only)
pnpm drizzle-kit push
```

### Q2: Team Collaboration on Schema Changes
**Question**: How do multiple developers coordinate schema modifications?

**Answer - Git-Based Migration Management**:
- **Migration files committed to git**: All `.sql` files in `drizzle/` directory tracked
- **Sequential numbering**: Drizzle auto-generates sequential migration IDs
- **Conflict resolution**: Manual merge of conflicting migrations, regenerate if needed
- **Review process**: Schema changes reviewed in PRs like any code change

### Q3: Environment-Specific Schema Management
**Question**: How are schema changes deployed across development/staging/production?

**Answer - Neon Database Branching + Drizzle**:
```bash
# Development workflow
neon branches create --name=feature-new-table --parent=dev-main
export DATABASE_URL="neon-connection-string-for-branch"
pnpm drizzle-kit migrate

# Production deployment  
export DATABASE_URL="neon-production-connection-string"
pnpm drizzle-kit migrate  # Apply all pending migrations
```

### Q4: Schema Rollback Procedures  
**Question**: How are problematic migrations rolled back?

**Answer - Neon + Drizzle Rollback Strategy**:
- **Database-level rollback**: Use Neon's point-in-time restore (up to 7 days)
- **Migration-level rollback**: Manual DOWN migrations (Drizzle doesn't auto-generate these)
- **Branch-level rollback**: Reset branch to previous state, regenerate migrations
- **Application-level rollback**: Deploy previous application version that's compatible

### Q5: Schema Version Synchronization
**Question**: How do we ensure application code and database schema stay in sync?

**Answer - Automated Validation**:
- **Type safety**: Drizzle generates TypeScript types from schema
- **Runtime validation**: Application startup checks via Drizzle introspection
- **CI/CD validation**: Automated migration testing in GitHub Actions
- **Development checks**: Local schema drift detection

## Implementation Plan for Milestone 1.3

### Phase 1: Drizzle Setup
1. **Install dependencies**:
   ```bash
   cd apps/web
   pnpm add drizzle-orm @neondatabase/serverless
   pnpm add -D drizzle-kit
   ```

2. **Create configuration** (`apps/web/drizzle.config.ts`):
   ```typescript
   import type { Config } from 'drizzle-kit';
   
   export default {
     schema: './src/lib/db/schema.ts',
     out: './drizzle',
     driver: 'pg',
     dbCredentials: {
       connectionString: process.env.DATABASE_URL!,
     },
   } satisfies Config;
   ```

### Phase 2: Schema Definition
1. **Create schema file** (`src/lib/db/schema.ts`):
   ```typescript
   import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
   
   export const users = pgTable('users', {
     user_id: text('user_id').primaryKey(),
     email: text('email').notNull().unique(),
     created_at: timestamp('created_at').defaultNow(),
     metadata: jsonb('metadata'),
   });
   
   // Additional tables...
   ```

2. **Generate initial migration**:
   ```bash
   pnpm drizzle-kit generate
   ```

### Phase 3: Database Client Setup
1. **Create database client** (`src/lib/db/index.ts`):
   ```typescript
   import { drizzle } from 'drizzle-orm/neon-http';
   import { neon } from '@neondatabase/serverless';
   import * as schema from './schema';
   
   const sql = neon(process.env.DATABASE_URL!);
   export const db = drizzle(sql, { schema });
   ```

### Phase 4: Development Workflow Documentation
1. **Add package.json scripts**:
   ```json
   {
     "scripts": {
       "db:generate": "drizzle-kit generate",
       "db:migrate": "drizzle-kit migrate", 
       "db:studio": "drizzle-kit studio",
       "db:push": "drizzle-kit push"
     }
   }
   ```

2. **Document workflow** in project README

## Advanced Migration Considerations

### Database Branching Strategy
- **Development**: Feature-specific database branches for experimental schemas
- **Staging**: Stable branch for integration testing  
- **Production**: Protected main branch with migration automation

### Migration Testing Strategy
```bash
# Test migrations on temporary branch
neon branches create --name=migration-test-$(date +%s)
export DATABASE_URL="test-branch-connection"
pnpm drizzle-kit migrate
pnpm test:database
neon branches delete migration-test-branch
```

### Schema Evolution Patterns
- **Additive changes**: New columns with defaults (safe)
- **Breaking changes**: Multi-step migrations with compatibility periods
- **Data migrations**: Custom scripts for complex data transformations
- **Index management**: Background index creation for large tables

## Integration with Milestone 1.3

This migration strategy integrates seamlessly with GitHub Issue #21 (Neon Postgres Database Setup):

1. **Manual Neon setup** (one-time): Create database, enable pgvector
2. **Drizzle integration** (development workflow): Schema management and migrations  
3. **Cloudflare Workers connection** (production deployment): Edge-compatible database access
4. **User profile management** (Issue #23): First real schema implementation

## Questions Resolved ✅

All pending database schema management questions from architecture documentation have been addressed:

- ✅ **Daily workflow commands**: Standard Drizzle Kit workflow
- ✅ **Team collaboration**: Git-based migration tracking
- ✅ **Environment management**: Neon branching + migration deployment
- ✅ **Rollback procedures**: Database and application-level strategies  
- ✅ **Version synchronization**: Type safety + automated validation

## Next Steps

1. **Implement during Milestone 1.3**: Follow the Phase 1-4 implementation plan
2. **Test the workflow**: Validate migration strategy with initial user tables
3. **Document lessons learned**: Update this strategy based on real-world usage
4. **Prepare for Issue #23**: User profile management will be first real test

---

**Dependencies**: Neon Postgres account and database creation (Issue #21)  
**Outcome**: Clear database schema management strategy for StudyPuck development