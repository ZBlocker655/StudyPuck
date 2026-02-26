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
# Local development (.env)
DATABASE_URL="postgresql://...@ep-development.region.aws.neon.tech/db"

# Production (Cloudflare environment variables)
DATABASE_URL="postgresql://...@ep-production.region.aws.neon.tech/db"

# Optional: Use pooled for runtime, direct for migrations
RUNTIME_DATABASE_URL="postgresql://...@ep-production-pooler.region.aws.neon.tech/db"
```

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