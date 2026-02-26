# Production Deployment Guide

**Purpose**: Safe deployment procedures for StudyPuck with database migrations and zero-downtime deployments.

## Deployment Architecture

### **Current Deployment Flow**
```
Git Push to Main → GitHub Actions → Cloudflare Pages → studypuck.app
                      ↓
                Database Migrations Applied → Development Branch Synced
```

### **The "Last Possible Moment" Strategy**
- **Database migrations** applied to production **before** code deployment
- **Development branch synced** **after** successful production deployment  
- **No downtime** - migrations are designed to be backward compatible
- **Automatic rollback** if deployment health checks fail

## Deployment Triggers

### **Automatic Deployment**
```bash
# Triggered automatically when code is merged to main
git checkout main
git merge feature/user-authentication  # Via GitHub PR
git push origin main

# This triggers:
# 1. GitHub Actions production workflow
# 2. Database migrations applied to production  
# 3. Cloudflare Pages deployment
# 4. Health checks and verification
# 5. Development branch sync
```

### **Manual Deployment (Emergency)**
```bash
# Re-run deployment workflow manually
gh workflow run deploy.yml

# Or trigger via GitHub UI:
# Actions → Deploy Production → Run workflow
```

## Pre-Deployment Validation

### **Required Checks Before Merge**
```bash
# 1. All tests pass in PR
gh pr checks 45 # Should show all green

# 2. Database migrations are backward compatible
cd packages/database
cat migrations/[latest-migration].sql
# Review: No DROP statements, no breaking ALTER statements

# 3. Health check endpoint works
curl -f https://studypuck.app/api/health

# 4. No critical issues in monitoring
# Check Cloudflare Analytics for error rates
```

### **Migration Safety Validation**
```bash
# Test migration on development branch first
DATABASE_URL=$DEV_DATABASE_URL pnpm migrate

# Verify no data loss
DATABASE_URL=$DEV_DATABASE_URL psql -c "SELECT COUNT(*) FROM users;"

# Check for breaking changes
echo "Migration Safety Checklist:
□ No columns dropped
□ No tables dropped  
□ New columns have defaults or allow NULL
□ Indexes added with CONCURRENTLY (if large tables)
□ Foreign key constraints added safely
□ Data migration scripts tested"
```

## Production Deployment Process

### **Automatic Workflow Steps**
The GitHub Actions production workflow executes these steps:

#### **Phase 1: Database Migration**
```yaml
- name: Apply migrations to production database
  env:
    DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
  run: |
    cd packages/database
    pnpm migrate  # Apply any new migrations to production
```

**What happens:**
- Connects to production database using **direct connection**
- Applies only **new migrations** (idempotent operation)
- **Fails fast** if migration encounters errors
- **No code deployment** if migrations fail

#### **Phase 2: Code Deployment**
```bash
# Cloudflare Pages automatically deploys from main branch
# This happens in parallel/after database migration
# Uses existing Cloudflare auto-deployment configuration
```

#### **Phase 3: Health Verification**
```yaml
- name: Verify production deployment
  run: |
    # Health check against live site
    curl -f https://studypuck.app/ || exit 1
    curl -f https://studypuck.app/api/health || exit 1
    echo "✅ Production deployment verified"
```

#### **Phase 4: Development Sync (Last Possible Moment)**
```yaml
- name: Sync development branch
  env:
    NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
  run: |
    # NOW we update development to match production
    neonctl branches reset development --parent production
    echo "✅ Development branch synced to production state"
```

## Environment Configuration

### **Production Environment Variables (Cloudflare)**
```bash
# Required environment variables in Cloudflare Pages
DATABASE_URL="postgresql://user:pass@ep-production.region.aws.neon.tech/db"
AUTH_SECRET="production-auth-secret-32-chars"
AUTH0_CLIENT_ID="production-auth0-client-id"
AUTH0_CLIENT_SECRET="production-auth0-client-secret"
AUTH0_ISSUER="https://studypuck.us.auth0.com"
AUTH0_AUDIENCE="https://api.studypuck.app"
```

### **Critical Configuration Notes**
- ⚠️ **Use DIRECT database connection** - not pooled connection
- ✅ **Production Auth0 application** - separate from development
- ✅ **Production auth secrets** - never reuse development secrets
- ✅ **HTTPS URLs only** - all endpoints must be secure

## Database Migration Best Practices

### **Backward Compatible Migrations**
```sql
-- ✅ GOOD: Add column with default
ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT '';

-- ✅ GOOD: Add optional column  
ALTER TABLE users ADD COLUMN preferences JSONB;

-- ✅ GOOD: Create new table
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  -- ...
);

-- ❌ BAD: Drop column (breaking change)
ALTER TABLE users DROP COLUMN old_field;

-- ❌ BAD: Rename column (breaking change)
ALTER TABLE users RENAME COLUMN email TO email_address;

-- ❌ BAD: Change column type (potential breaking change)
ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ;
```

### **Migration Strategy for Breaking Changes**
```sql
-- Phase 1: Add new column
ALTER TABLE users ADD COLUMN email_address TEXT;

-- Phase 2: Application update to populate both fields
-- (Deploy code that writes to both email and email_address)

-- Phase 3: Data migration  
UPDATE users SET email_address = email WHERE email_address IS NULL;

-- Phase 4: Drop old column (separate deployment)
ALTER TABLE users DROP COLUMN email;
```

### **Large Table Migration Strategy**
```sql
-- For tables with millions of rows:

-- ✅ Add indexes concurrently
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- ✅ Add columns in batches
ALTER TABLE large_table ADD COLUMN new_field TEXT;
-- Then populate in batches via application code

-- ❌ Avoid large data migrations in single transaction
-- Instead: Use background jobs or batch processing
```

## Health Checks & Monitoring

### **Application Health Endpoint**
```typescript
// apps/web/src/routes/api/health/+server.ts
import { db } from '@studypuck/database';

export async function GET() {
  try {
    // Test database connectivity
    const result = await db.select().from(users).limit(1);
    
    // Test Auth0 configuration
    const authConfigured = !!(process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET);
    
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      auth: authConfigured ? 'configured' : 'missing',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### **Deployment Monitoring**
```bash
# Monitor deployment success
curl -s https://studypuck.app/api/health | jq '.'

# Expected healthy response:
{
  "status": "healthy",
  "timestamp": "2026-02-02T05:00:00.000Z",
  "database": "connected", 
  "auth": "configured",
  "version": "a1b2c3d"
}
```

### **Post-Deployment Verification Checklist**
```bash
echo "Post-Deployment Checklist:
□ Health endpoint returns 200 OK
□ Database connectivity confirmed
□ Authentication flow works  
□ No errors in Cloudflare Analytics
□ Key user flows function correctly
□ Performance metrics within acceptable range"
```

## Rollback Procedures

### **Automatic Rollback Triggers**
```yaml
# In GitHub Actions deploy workflow
- name: Verify deployment and rollback if needed
  run: |
    # Health check with timeout
    if ! timeout 30 curl -f https://studypuck.app/api/health; then
      echo "❌ Health check failed - initiating rollback"
      
      # Rollback database (if safe)
      # Note: Database rollbacks are complex - usually forward-fix instead
      
      # Rollback code deployment
      # Cloudflare: redeploy previous commit
      # This requires manual intervention or Cloudflare API calls
      
      exit 1
    fi
```

### **Manual Rollback Procedures**

#### **Code Rollback (Cloudflare Pages)**
```bash
# Option 1: Revert commit and redeploy
git revert HEAD
git push origin main  # Triggers new deployment with reverted code

# Option 2: Redeploy previous commit
# Via Cloudflare Pages Dashboard:
# Pages → studypuck.app → Deployments → [previous deployment] → Retry deployment
```

#### **Database Rollback (Complex)**
```bash
# Database rollbacks are generally not recommended
# Instead, prefer forward fixes:

# 1. Identify problematic migration
cd packages/database
ls migrations/ | tail -5

# 2. Create fixing migration
pnpm generate --custom --name fix-migration-issue

# 3. Write SQL to fix the issue (not revert)
# migrations/[new-fix-migration].sql

# 4. Deploy fix
git add migrations/
git commit -m "Fix database migration issue"
git push origin main
```

### **Emergency Procedures**

#### **Complete Site Outage**
```bash
# 1. Check Cloudflare status
curl -I https://studypuck.app/

# 2. Check database connectivity  
psql $PROD_DATABASE_URL -c "SELECT NOW();"

# 3. Check recent deployments
gh run list --limit 5

# 4. Immediate rollback via Cloudflare
# Use Cloudflare Pages Dashboard to redeploy last known good deployment

# 5. Communicate status
# Update status page, notify team
```

#### **Database Connection Issues**
```bash
# 1. Verify database is running
neonctl status

# 2. Check connection string
echo $PROD_DATABASE_URL | grep -o "ep-[^.]*"  # Should show production branch

# 3. Test connection
timeout 10 psql $PROD_DATABASE_URL -c "SELECT 1;"

# 4. Check Neon dashboard for database status
# 5. Consider switching to database replica if available
```

## Deployment Security

### **Access Control**
```yaml
# GitHub Actions production deployment requires:
environment: production  # Must be approved by repository maintainers
```

### **Secret Management**
```bash
# Rotation schedule:
# - AUTH_SECRET: Every 90 days
# - Database passwords: Every 180 days  
# - API tokens: Every 365 days or when team members change

# Verification:
echo "Security Checklist:
□ All secrets rotated on schedule
□ Production secrets never used in development
□ Database uses direct connections only
□ HTTPS enforced for all endpoints
□ Auth0 production app properly configured"
```

### **Audit Trail**
```bash
# Deployment history
gh run list --workflow=deploy.yml --limit 10

# Database change history
psql $PROD_DATABASE_URL -c "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5;"

# Git deployment history
git log --oneline --grep="deploy" -10
```

## Monitoring & Alerting

### **Key Metrics to Monitor**
- **Response time**: API endpoints < 500ms
- **Error rate**: < 1% of requests
- **Database connections**: Within connection pool limits  
- **Authentication success rate**: > 99%
- **Page load time**: < 3 seconds

### **Alerting Setup**
```bash
# Cloudflare Analytics alerts (configure in dashboard)
# - Error rate > 5%
# - Response time > 2 seconds
# - Uptime < 99.9%

# Database monitoring (Neon dashboard)
# - Connection count approaching limits
# - Query performance degradation
# - Storage usage growth

# GitHub Actions alerts
# - Deployment failures
# - Test failures on main branch
```

---

**Next**: See [Troubleshooting Guide](./troubleshooting.md) for common deployment issues and solutions.