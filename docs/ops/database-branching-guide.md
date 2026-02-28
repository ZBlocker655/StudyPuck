# Database Branching Guide

**Purpose**: Complete guide to Neon database branch management for StudyPuck development.

## Core Philosophy: "Last Possible Moment" Migrations

### **Key Principle**
Development branch stays clean until the absolute last moment - when changes are deployed to production. This enables:
- ✅ **Parallel development** without environment pollution
- ✅ **Feature isolation** for both humans and AI agents
- ✅ **Stable baseline** for all developers to branch from

### **Migration Timeline**
```
Feature Development (isolated) → GitHub CI Testing → Production Deploy → Development Sync
```
Development branch is updated **after** successful production deployment, not during feature development.

## Database Branch Structure

### **Long-lived Branches**
```
studypuck-db (Neon Project)
├── production ←── Live studypuck.app
└── development ←── Clean baseline for branching
```

### **Ephemeral Branches**
```
feature/issue-45 ←── Human developer isolated work
agent/issue-67 ←── AI agent isolated work  
test-sha123 ←── GitHub Actions CI testing
```

## Connection String Management

### **Connection Types**
- **DIRECT**: `ep-branch-name.region.aws.neon.tech` (required for migrations)
- **POOLED**: `ep-branch-name-pooler.region.aws.neon.tech` (for application runtime)

### **Critical Rule**
⚠️ **Always use DIRECT connections for migrations** - pooled connections prevent proper migration tracking.

### **Environment Configuration**
```bash
# apps/web/.env — only ONE DATABASE_URL active at a time
# When switching to a feature branch, COMMENT OUT the previous value (do not delete).
# development branch (baseline, when not on a feature branch):
# DATABASE_URL="postgresql://...@ep-development.region.aws.neon.tech/db"
# feature/issue-N branch (active while working on the feature):
DATABASE_URL="postgresql://...@ep-feature-issue-N.region.aws.neon.tech/db"

# Production (Cloudflare environment variables — set in Cloudflare dashboard)
DATABASE_URL="postgresql://...@ep-production.region.aws.neon.tech/db"
```

> **Workflow rule**: Before starting feature branch work, comment out the previous `DATABASE_URL` line
> and add the feature branch connection string below it. This preserves history and makes it easy to
> revert. Restore the development branch URL when the feature PR is merged.

## Branch Lifecycle Management

### **Development Branch Maintenance**
```bash
# Development branch is synced AFTER production deployments
neon branches reset development --parent production
```

### **When Development Gets Updated**
- **After production releases** - Development "catches up" to production state
- **Never during feature development** - Keeps development clean for new features
- **Monthly cleanup** - Remove any accumulated test data

### **Feature Branch Creation**
```bash
# Human developers
neon branches create feature/issue-45 --parent development

# AI agents (automatic via GitHub Actions)
neon branches create agent/issue-67 --parent development
```

### **Branch Cleanup**
```bash
# After PR merge
neon branches delete feature/issue-45
neon branches delete agent/issue-67

# Automatic cleanup for test branches
neon branches delete test-sha123
```

### **Branch Count Management (Free Tier Limit: 10 branches)**

The Neon free tier allows a maximum of 10 branches. Every production deployment creates a backup branch, so old backup branches must be periodically pruned.

**Post-deployment agent check procedure** (run after every production deploy):

```bash
# 1. Count current branches
neonctl branches list

# 2. If total branches >= 7:
#    a. Count production backup branches (named backup/prod-YYYY-MM-DD or similar)
#    b. Ask the human:
#       "You have N Neon branches (limit: 10). There are X production backup branches.
#        Should I delete the oldest backup branches to stay under 7 total,
#        or would you prefer to manage branches yourself?"
#    c. If human approves: delete oldest backup branches (sorted by created_at ascending)
#       until total is under 7
#    d. If human prefers to manage: do nothing, remind them of the limit

# 3. List backup branches sorted oldest first
neonctl branches list --output json | \
  node -e "const b=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
           b.filter(x=>x.name.startsWith('backup/')).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).forEach(x=>console.log(x.name, x.created_at))"

# 4. Delete a specific backup branch (after human approval)
neonctl branches delete backup/prod-2025-01-15
```

**Threshold summary:**
- **< 7 branches**: No action needed
- **7–9 branches**: Warn and offer to clean up
- **10 branches**: Blocked — must delete before next deploy can create backup

## Migration Best Practices

### **Environment Variable Loading**
Drizzle Kit requires explicit dotenv configuration:
```typescript
// drizzle.config.ts
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Safe dotenv loading (works in all environments)
const envPath = resolve(__dirname, '../../.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}
```

### **Migration Commands**
```bash
# Generate new migration
pnpm run generate

# Apply migrations (uses environment DATABASE_URL)
pnpm run migrate

# Check migration status
pnpm run studio  # Opens Drizzle Studio
```

### **Known Limitations**
- **Migration tracking**: Drizzle Kit 0.31.8 + @neondatabase/serverless has inconsistent tracking
- **Workaround**: Use direct connections, accept tracking limitations
- **Impact**: Minimal - migrations work correctly, tracking is cosmetic

## Branch Usage by Environment

| Branch Type | Lifetime | Purpose | Updated When |
|-------------|----------|---------|--------------|
| **production** | Permanent | Live studypuck.app data | Production deployments |
| **development** | Long-lived | Clean baseline for branching | After production deployments |
| **feature/xyz** | Per-feature | Human isolated development | During feature work |
| **agent/issue-N** | Per-issue | AI agent isolated development | During agent work |
| **test-sha** | Per-commit | GitHub Actions CI testing | Created/destroyed per test |

## Testing Strategy

StudyPuck uses a **two-tier hybrid testing approach** to balance test speed, cost, and production parity.

### Tier 1: Docker Compose Tests (default, runs every CI pass)

All standard integration tests use a local Docker Postgres instance (`pgvector/pgvector:pg15`):

```bash
# Start test database
cd packages/database
pnpm test:setup

# Run all tests
pnpm test

# Stop and clean up
pnpm test:cleanup
```

- **Fast**: runs in memory via `tmpfs`, no network latency
- **Free**: no Neon quota consumption
- **Offline**: works without internet or Neon credentials
- File pattern: `*.test.ts`

### Tier 2: Ephemeral Neon Tests (on-demand, NOT in every CI pass)

For real-world validation (e.g., verifying a migration against a production-like Neon branch):

```bash
# Create a dedicated test branch
neon branches create test-issue-N --parent development

# Set connection string
export NEON_TEST_DATABASE_URL="postgresql://..."

# Run Neon tests only
pnpm test:neon
```

- **Production parity**: uses the actual Neon serverless driver and engine
- **Ephemeral**: tests are deleted when their linked issue closes
- File pattern: `*-issue-N.neon.test.ts` — **issue number in filename is mandatory**

### Ephemeral Neon Test Naming Convention

```
migration-issue-36.neon.test.ts   ✅ correct
schema-validation-issue-42.neon.test.ts  ✅ correct
migration-smoke.neon.test.ts      ❌ will fail CI — no issue number
```

### Ephemeral Test Lifecycle

1. **Create**: write `*-issue-N.neon.test.ts` alongside the issue work
2. **Run**: `pnpm test:neon` with `NEON_TEST_DATABASE_URL` pointing at a test branch
3. **Retain**: the test lives until the issue closes
4. **Delete**: when issue #N is closed, **delete the file in the closing PR**

A CI enforcement script (`scripts/check-ephemeral-tests.mjs`) runs on every push and **fails CI** if:
- A `.neon.test.ts` filename has no `issue-N` pattern
- The linked issue is already CLOSED (stale test reminder)

This ensures ephemeral tests never accumulate and never degrade test suite performance.

### When to Write Each Test Type

| Scenario | Use |
|---|---|
| CRUD operations, business logic, query correctness | `*.test.ts` (Docker) |
| Migration applies cleanly (routine) | `*.test.ts` (Docker) |
| Migration against realistic data volume or edge cases | `*-issue-N.neon.test.ts` (Neon) |
| Verifying Neon serverless driver behavior | `*-issue-N.neon.test.ts` (Neon) |

## Troubleshooting

### **Common Issues**

#### **"Relation already exists" error**
```bash
# Cause: Migration tracking out of sync
# Solution: Use direct connection, check branch state
```

#### **Environment variables not found**
```bash
# Cause: Drizzle Kit not loading .env
# Solution: Verify dotenv configuration in drizzle.config.ts
```

#### **Migration hangs or times out**
```bash
# Cause: Using pooled connection for migrations
# Solution: Switch to direct connection string
```

### **Emergency Procedures**

#### **Reset Development Branch**
```bash
neon branches reset development --parent production
```

#### **Nuclear Option: Recreate Branch**
```bash
neon branches delete development
neon branches create development --parent production
# NOTE: Updates connection strings - must update environment variables
```

---

**Next**: See [Environment Setup](./environment-setup.md) for detailed environment variable configuration.