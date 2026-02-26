# Troubleshooting Guide

**Purpose**: Common issues and solutions for StudyPuck development and deployment.

## Database Issues

### **Migration Problems**

#### **"DATABASE_URL not found"**
```bash
# Symptom
Error: Please provide required params for Postgres driver: [x] url: undefined

# Cause
Drizzle Kit not loading environment variables

# Solution
cd packages/database
echo $DATABASE_URL  # Should show connection string
cat drizzle.config.ts | grep dotenv  # Should show dotenv loading

# If missing, verify dotenv configuration:
head -10 drizzle.config.ts
```

#### **"Migration tracking table not found"**
```bash
# Symptom  
relation "__drizzle_migrations" does not exist

# Cause
Known limitation with Drizzle Kit 0.31.8 + @neondatabase/serverless

# Solution (Expected behavior - not critical)
# Migrations work correctly, tracking is cosmetic
# Tables are created properly even without tracking table

# Verification
psql $DATABASE_URL -c "\dt"  # Should show all expected tables
```

#### **"Relation already exists" error**
```bash
# Symptom
error: relation "users" already exists

# Cause
Migration tracking out of sync with actual database state

# Solution 1: Use fresh database branch
neon branches create feature/fresh --parent development
DATABASE_URL=fresh-branch-url pnpm migrate

# Solution 2: Manual tracking fix (advanced)
# See database-branching-guide.md for detailed procedure
```

#### **"Connection timeout" during migration**
```bash
# Symptom
Migration hangs or times out

# Cause
Using pooled connection for migrations

# Solution
# Verify using direct connection (not pooled)
echo $DATABASE_URL | grep "pooler" && echo "❌ Using pooled connection" || echo "✅ Using direct connection"

# Get direct connection from Neon dashboard
# Update DATABASE_URL to remove "-pooler" from hostname
```

### **Connection Issues**

#### **"Cannot connect to database"**
```bash
# Symptom
Error: getaddrinfo ENOTFOUND ep-branch-name.neon.tech

# Diagnosis steps
# 1. Check connection string format
echo $DATABASE_URL | head -50

# 2. Verify branch exists
neon branches list | grep branch-name

# 3. Test basic connectivity
timeout 10 psql $DATABASE_URL -c "SELECT 1;"

# 4. Check Neon database status
neon status

# Common fixes
# - Verify SSL parameters: ?sslmode=require&channel_binding=require
# - Check for typos in branch name
# - Ensure database isn't suspended (inactive)
```

#### **"SSL connection required"**
```bash
# Symptom
Error: connection requires SSL

# Solution
# Ensure connection string includes SSL parameters
echo $DATABASE_URL | grep "sslmode=require" || echo "❌ Missing SSL config"

# Correct format:
# postgresql://user:pass@host/db?sslmode=require&channel_binding=require
```

## Environment Variable Issues

### **Local Development**

#### **"Environment variables not loaded"**
```bash
# Symptom
Variables work in one package but not another

# Diagnosis
# Check .env file location
ls -la .env  # Should be at project root

# Check package-specific loading
cd packages/database
head -15 drizzle.config.ts  # Should show dotenv loading

cd apps/web
pnpm dev  # SvelteKit should auto-discover root .env
```

#### **"Variables work locally but not in CI"**
```bash
# Symptom
Tests pass locally but fail in GitHub Actions

# Diagnosis
# Check GitHub secrets configuration
gh secret list

# Check workflow environment mapping
cat .github/workflows/test.yml | grep -A5 "env:"

# Common fixes
# - Verify secret names match exactly (case-sensitive)
# - Check secret scope (repository vs environment)
# - Verify workflow has access to secrets
```

### **Production Environment**

#### **"Auth0 configuration errors"**
```bash
# Symptom
Authentication fails in production but works locally

# Diagnosis
curl -s https://studypuck.app/api/health | jq '.auth'

# Check Cloudflare environment variables
# Pages → studypuck.app → Settings → Environment variables

# Common issues
# - Wrong Auth0 domain (dev vs production)
# - Incorrect client ID/secret
# - Missing environment variables
# - HTTPS/HTTP mismatch in URLs
```

#### **"Database connection fails in production"**
```bash
# Symptom
App works locally but database errors in production

# Check production health endpoint
curl -s https://studypuck.app/api/health | jq '.'

# Common causes
# - Using development DATABASE_URL in production
# - Pooled connection where direct required
# - Wrong Neon branch configured
# - Database suspended due to inactivity

# Solution
# Verify Cloudflare environment variables
# Ensure using production database URL
# Check Neon dashboard for database status
```

## Git & GitHub Issues

### **Branch Management**

#### **"Cannot push to main"**
```bash
# Symptom
error: failed to push some refs to 'origin'
! [remote rejected] main -> main (protected branch hook declined)

# Cause
Branch protection rules enforce PR workflow

# Solution (Correct workflow)
git checkout -b feature/my-changes
git add . && git commit -m "Description"
git push origin feature/my-changes
gh pr create
```

#### **"Merge conflicts in migrations"**
```bash
# Symptom
Git conflicts in migration files during rebase/merge

# Solution (Never manually edit migration files)
# 1. Rebase to latest main
git checkout main && git pull origin main
git checkout feature/my-branch
git rebase main

# 2. Regenerate migrations
cd packages/database
rm -rf migrations
pnpm generate  # Regenerates migrations from current schema

# 3. Commit regenerated migrations
git add migrations/
git commit -m "Regenerate migrations after rebase"
```

### **GitHub Actions Issues**

#### **"Workflow not triggering"**
```bash
# Check workflow file syntax
yamllint .github/workflows/test.yml

# Check workflow is enabled
gh workflow list

# Check triggering events
cat .github/workflows/test.yml | grep -A5 "on:"

# Enable workflow if disabled
gh workflow enable test.yml
```

#### **"Agent setup not working"**
```bash
# Symptom
Issue assigned to agent but no database branch created

# Diagnosis
# Check if agent setup workflow exists
ls .github/workflows/ | grep agent

# Check recent workflow runs
gh run list --workflow=agent-setup.yml

# Check assignee matching
cat .github/workflows/agent-setup.yml | grep "contains.*login"

# Common fixes
# - Verify assignee username matches workflow condition
# - Check AGENT_NEON_API_KEY has correct permissions
# - Ensure workflow is enabled
```

## Application Issues

### **Development Server Problems**

#### **"Vite dev server errors"**
```bash
# Symptom
pnpm dev fails with module resolution errors

# Common fixes
# 1. Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 2. Clear Vite cache
rm -rf apps/web/.svelte-kit

# 3. Restart dev server with clean slate
cd apps/web
pnpm dev --force

# 4. Check for TypeScript errors
pnpm turbo check-types --filter=web
```

#### **"Database operations fail during development"**
```bash
# Symptom
App starts but database queries fail

# Diagnosis
# Check database connection
cd packages/database
echo $DATABASE_URL
timeout 10 psql $DATABASE_URL -c "SELECT NOW();"

# Check migrations applied
pnpm migrate

# Check tables exist
psql $DATABASE_URL -c "\dt"

# Common fixes
# - Apply missing migrations
# - Switch to correct database branch
# - Verify connection string format
```

### **Build Issues**

#### **"TypeScript compilation errors"**
```bash
# Symptom
pnpm turbo build --filter=web fails

# Common checks
# 1. Type check specific issues
pnpm turbo check-types --filter=web

# 2. Update database types
cd packages/database
pnpm generate  # Regenerates types from schema

# 3. Clear TypeScript cache
rm -rf apps/web/.svelte-kit/tsconfig.tsbuildinfo

# 4. Check for missing dependencies
cd apps/web
pnpm install
```

#### **"Import resolution errors"**
```bash
# Symptom
Cannot resolve imports from @studypuck/database

# Check package exports
cat packages/database/package.json | grep -A10 "exports"

# Verify TypeScript paths
cat apps/web/tsconfig.json | grep -A5 "paths"

# Rebuild database package
cd packages/database
pnpm build  # If build script exists
```

## Performance Issues

### **Slow Database Queries**

#### **"Query performance degradation"**
```bash
# Diagnosis tools
# 1. Check query execution plans
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM cards LIMIT 10;"

# 2. Check for missing indexes
psql $DATABASE_URL -c "
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE tablename IN ('users', 'cards', 'groups')
ORDER BY tablename, attname;"

# 3. Monitor connection usage
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Common fixes
# - Add indexes for frequently queried columns
# - Optimize WHERE clause conditions  
# - Use connection pooling for high-traffic applications
```

#### **"Memory issues during build"**
```bash
# Symptom
Build process runs out of memory

# Solutions
# 1. Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm build

# 2. Clear build caches
rm -rf .turbo node_modules/.cache

# 3. Build packages individually
pnpm turbo build --filter=database
pnpm turbo build --filter=web
```

## Security Issues

### **Authentication Problems**

#### **"Auth0 integration errors"**
```bash
# Symptom
Users cannot log in or authentication loops

# Diagnosis checklist
echo "Auth0 Debug Checklist:
□ AUTH0_ISSUER matches your Auth0 domain
□ AUTH0_CLIENT_ID matches your application
□ AUTH0_CLIENT_SECRET is correct
□ Callback URLs configured in Auth0 dashboard
□ Auth0 application type is 'Regular Web Application'
□ Grant types include 'authorization_code'"

# Test Auth0 configuration
curl -s "https://$AUTH0_DOMAIN/.well-known/openid_configuration" | jq '.'
```

#### **"Session management issues"**
```bash
# Symptom
Users logged out unexpectedly or sessions persist incorrectly

# Check session configuration
echo "Session Debug:
□ AUTH_SECRET is 32+ characters
□ AUTH_TRUST_HOST is true in production
□ Cookie settings appropriate for domain
□ Session expiration configured correctly"

# Test session endpoint
curl -s https://studypuck.app/api/auth/session
```

## Monitoring & Alerting

### **Health Check Failures**

#### **"Health endpoint returning errors"**
```bash
# Test health endpoint
curl -v https://studypuck.app/api/health

# Check specific components
curl -s https://studypuck.app/api/health | jq '.database'
curl -s https://studypuck.app/api/health | jq '.auth'

# Common fixes
# - Database connection timeout → check connection string
# - Auth configuration missing → verify environment variables
# - Application errors → check Cloudflare logs
```

## Emergency Procedures

### **Production Outage Response**

#### **Immediate Response (0-5 minutes)**
```bash
# 1. Verify outage scope
curl -I https://studypuck.app/
curl -I https://studypuck.app/api/health

# 2. Check recent deployments
gh run list --limit 5

# 3. Check Cloudflare status
# Visit Cloudflare dashboard or status.cloudflare.com

# 4. Initial rollback if needed
# Redeploy last known good version via Cloudflare Pages
```

#### **Investigation (5-15 minutes)**
```bash
# 1. Check database status
neonctl status
psql $PROD_DATABASE_URL -c "SELECT NOW();"

# 2. Check recent changes
git log --oneline -10

# 3. Check error logs
# Cloudflare Pages → Functions → Logs
# Or via Cloudflare API if configured

# 4. Check GitHub Actions
gh run list --limit 10 | grep -E "(failed|cancelled)"
```

#### **Communication (Within 15 minutes)**
```bash
# 1. Update status page (if available)
# 2. Notify team via established channels
# 3. Document timeline and actions taken

# Issue template:
echo "Outage Report:
- Time: $(date -u)
- Scope: [full site | API only | specific features]
- Cause: [under investigation | identified]
- ETA: [investigating | X minutes]
- Actions: [list of steps taken]"
```

### **Data Recovery Procedures**

#### **Database corruption or data loss**
```bash
# 1. Stop writes immediately
# Update Cloudflare to serve maintenance page

# 2. Assess damage
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM users;"
# Compare with expected counts

# 3. Check Neon backups
neonctl backups list

# 4. Plan recovery
# - Point-in-time recovery if available
# - Data restoration from backups
# - Forward migration to fix corruption

# 5. Test recovery in isolated environment
neon branches create recovery-test --parent production
# Test recovery procedures on recovery-test branch first
```

---

**For additional support**: 
- Check [Database Branching Guide](./database-branching-guide.md) for database-specific procedures
- Review [Environment Setup](./environment-setup.md) for configuration details
- Consult [GitHub Actions Setup](./github-actions-setup.md) for CI/CD troubleshooting