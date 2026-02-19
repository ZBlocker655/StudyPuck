# Human Developer Workflows

**Purpose**: Complete SDLC procedures for human developers working on StudyPuck features.

## Core Development Principles

### **"Last Possible Moment" Strategy**
- **Development branch stays clean** until production deployment
- **Feature isolation** prevents environment pollution
- **Parallel development** enabled for multiple developers/agents
- **Database migrations** applied only after successful production deployment

### **Branch Hierarchy**
```
production (authoritative) ← studypuck.app
    ↓ (synced after deployments)
development (clean baseline) ← all features branch from here
    ├── feature/issue-45 ← human developer work
    ├── agent/issue-67 ← AI agent work
    └── test-sha123 ← ephemeral GitHub Actions testing
```

## Feature Development Workflow

### **Phase 1: Feature Planning & Setup**

#### **1.1 Issue Analysis**
```bash
# Review issue requirements and acceptance criteria
gh issue view 45

# Check for related issues or dependencies
gh issue list --search "related to authentication" 

# Understand scope and complexity
echo "Feature complexity assessment:
- Schema changes needed: [yes/no]
- Breaking changes: [yes/no]  
- External dependencies: [list]
- Estimated complexity: [simple/moderate/complex]"
```

#### **1.2 Git Branch Creation**
```bash
# Always branch from main to get latest development state
git checkout main
git pull origin main

# Create feature branch with descriptive name
git checkout -b feature/issue-45-user-authentication
```

#### **1.3 Database Strategy Decision**

**Option A: Use Development Branch (Simple Changes)**
```bash
# For non-conflicting changes (no schema modifications)
DATABASE_URL=$DEV_DATABASE_URL

# Advantages: Fast, simple, shared environment
# Disadvantages: Potential conflicts with other developers
# Use when: Adding routes, UI changes, business logic without schema
```

**Option B: Create Feature Database Branch (Recommended)**
```bash
# For schema changes or complex features
neon branches create feature/issue-45 --parent development

# Get feature-specific connection string
neon connection-string feature/issue-45

# Update local environment
echo "DATABASE_URL='postgresql://...@feature-issue-45.example.neon.tech/db'" >> .env.local

# Advantages: Complete isolation, no conflicts
# Disadvantages: Additional setup, resource usage
# Use when: Schema changes, complex features, experimental work
```

### **Phase 2: Development Process**

#### **2.1 Environment Verification**
```bash
# Verify environment setup
cd packages/database
pnpm migrate # Should apply existing migrations successfully

cd apps/web
pnpm dev # Should start without errors
```

#### **2.2 Iterative Development**
```bash
# Development cycle in isolation
1. Write code and tests
2. Create database migrations (if needed):
   cd packages/database
   pnpm generate # Creates new migration file
   pnpm migrate  # Applies to feature database
   
3. Test feature functionality:
   cd apps/web
   pnpm dev
   # Manual testing in browser
   
4. Run automated tests:
   pnpm turbo test --filter=web
   
5. Verify build works:
   pnpm turbo build --filter=web
   
6. Commit incremental progress:
   git add .
   git commit -m "Add user authentication middleware
   
   - Implement Auth0 session validation
   - Add protected route decorator
   - Update user model with session fields"
```

#### **2.3 Schema Change Management**
```bash
# When making database schema changes:

# 1. Generate migration
cd packages/database
pnpm generate

# 2. Review generated migration
cat migrations/[latest-migration-file].sql

# 3. Test migration locally
pnpm migrate

# 4. Verify schema changes
pnpm studio # Opens Drizzle Studio to inspect schema

# 5. Test migration rollback safety (if possible)
# Note: Most migrations are forward-only

# 🔑 KEY: Development branch remains unchanged during this process
```

### **Phase 3: Testing & Quality Assurance**

#### **3.1 Local Testing**
```bash
# Run full test suite
pnpm turbo lint check-types test build --filter=web

# Test with fresh database state (if using feature branch)
neon branches reset feature/issue-45 --parent development
cd packages/database && pnpm migrate
cd apps/web && pnpm test

# Manual testing checklist:
echo "Manual Testing Checklist:
□ Feature works as specified in issue
□ No regressions in existing functionality  
□ Error handling works correctly
□ Performance is acceptable
□ Mobile responsiveness (if UI changes)
□ Accessibility compliance (if UI changes)"
```

#### **3.2 Integration Testing**
```bash
# Test feature with realistic data
# Create test scenarios that match production use cases

# For authentication feature example:
echo "Integration Test Scenarios:
□ New user registration flow
□ Existing user login flow  
□ Session persistence across page refreshes
□ Logout and session cleanup
□ Invalid credential handling
□ Auth0 integration edge cases"
```

### **Phase 4: Pull Request Creation**

#### **4.1 Pre-PR Preparation**
```bash
# Ensure all changes are committed
git status # Should be clean

# Rebase against main if needed
git rebase main

# Run final validation
pnpm turbo lint check-types test build --filter=web
```

#### **4.2 Create Pull Request**
```bash
# Push feature branch
git push origin feature/issue-45-user-authentication

# Create PR with comprehensive description
gh pr create --title "Implement user authentication (Issue #45)" --body "
## Summary
Implements user authentication using Auth0 integration as specified in issue #45.

## Changes Made
- Added Auth0 configuration and middleware
- Created user session management
- Updated database schema with user tables
- Added authentication guards for protected routes
- Implemented logout functionality

## Database Changes
- New migration: [migration-file-name]
- Tables added: users, sessions
- No breaking changes to existing schema

## Testing
- All automated tests pass
- Manual testing completed for all auth flows
- Integration testing with Auth0 completed
- No regressions detected

## Deployment Notes
- Requires Auth0 environment variables in production
- Database migration will be applied automatically
- Feature branch database: feature/issue-45

## Closes #45
"
```

#### **4.3 PR Requirements Checklist**
```bash
echo "PR Checklist:
□ Descriptive title referencing issue number
□ Comprehensive description explaining changes
□ Database changes documented
□ Testing approach described  
□ Breaking changes highlighted (if any)
□ Environment requirements noted
□ Issue reference included (Closes #45)"
```

### **Phase 5: Code Review & Iteration**

#### **5.1 Review Response**
```bash
# Respond to review feedback promptly
# Make requested changes in feature database environment

# For review comments requiring changes:
git checkout feature/issue-45-user-authentication
# Make changes
git add .
git commit -m "Address review feedback: improve error handling"
git push origin feature/issue-45-user-authentication

# PR automatically updates with new commits
```

#### **5.2 Review Checklist for Developer**
```bash
echo "Self-Review Checklist:
□ Code follows project conventions
□ No debugging code left in
□ Error handling is comprehensive
□ Performance considerations addressed
□ Security best practices followed
□ Documentation updated if needed
□ Migration files are clean and well-structured"
```

### **Phase 6: Merge & Deployment**

#### **6.1 Pre-Merge Final Check**
```bash
# Ensure branch is up to date
git checkout main && git pull origin main
git checkout feature/issue-45-user-authentication
git rebase main

# Final test run
pnpm turbo lint check-types test build --filter=web
```

#### **6.2 Merge Process**
```bash
# Merge via GitHub UI (recommended) or CLI
gh pr merge --squash --delete-branch

# The "Last Possible Moment" flow automatically triggers:
# 1. GitHub Actions runs tests with ephemeral database
# 2. Tests pass ✅
# 3. PR merged to main
# 4. Production deployment workflow runs:
#    - Migrations applied to production database
#    - Cloudflare deploys code to studypuck.app
#    - Health check verifies deployment
#    - Development branch synced to match production
```

#### **6.3 Post-Merge Cleanup**
```bash
# Local cleanup
git checkout main
git pull origin main
git branch -d feature/issue-45-user-authentication

# Database cleanup (if feature branch was created)
neon branches delete feature/issue-45

# Verify deployment success
curl -f https://studypuck.app/api/health

# Update local development environment
cd packages/database && pnpm migrate # Gets latest production schema
```

## Multi-Developer Coordination

### **Avoiding Conflicts**

#### **Database Changes**
```bash
# When multiple developers need schema changes:

# Developer A working on authentication
neon branches create feature/auth --parent development

# Developer B working on payments  
neon branches create feature/payments --parent development

# Both work in complete isolation until merge
# No shared environment pollution
```

#### **Git Coordination**
```bash
# Frequently sync with main
git checkout main && git pull origin main
git checkout feature/my-feature
git rebase main # Resolve any conflicts early

# Use descriptive commit messages
git commit -m "auth: add session middleware

- Implement Auth0 token validation
- Add user context to request objects
- Handle token expiration gracefully"
```

### **Communication Patterns**
```bash
# Issue coordination
gh issue comment 45 --body "🔨 Started implementation of user authentication
- Created feature database branch: feature/auth
- Targeting Auth0 integration approach
- Estimated completion: end of week"

# PR coordination
gh pr comment 67 --body "👀 This PR may conflict with authentication PR #65
- Both modify user schema
- Suggest coordinating merge order"
```

## Development Environment Management

### **Environment Switching**
```bash
# Switch between database environments easily

# Work on development database (shared)
export DATABASE_URL=$DEV_DATABASE_URL

# Work on feature database (isolated)
export DATABASE_URL=$FEATURE_DATABASE_URL

# Quick environment check
echo "Current database: ${DATABASE_URL:0:30}..."
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;" # Should work
```

### **Development Tools**
```bash
# Database inspection
pnpm studio # Opens Drizzle Studio

# Database CLI access  
psql $DATABASE_URL

# Migration management
cd packages/database
pnpm generate # Create new migration
pnpm migrate  # Apply migrations
pnpm push     # Push schema directly (dev only)
```

## Troubleshooting Common Issues

### **Development Environment**

#### **"DATABASE_URL not found"**
```bash
# Check environment file
cat .env | grep DATABASE_URL

# Verify Drizzle config
cd packages/database
head -20 drizzle.config.ts | grep dotenv
```

#### **"Migration failed"**
```bash
# Check connection type (should be direct, not pooled)
echo $DATABASE_URL | grep -o "pooler" || echo "Using direct connection ✅"

# Verify database permissions
psql $DATABASE_URL -c "SELECT current_user, current_database();"
```

#### **"Tests failing locally"**
```bash
# Reset to clean state
git stash
git checkout main && git pull origin main
git checkout feature/my-feature
git rebase main

# Clean install
rm -rf node_modules
pnpm install

# Reset database to clean state
neon branches reset feature/my-feature --parent development
cd packages/database && pnpm migrate
```

### **Integration Issues**

#### **"Feature works locally but fails in PR"**
```bash
# GitHub Actions uses development database + your migrations
# Check that migrations work on clean development baseline

# Test locally:
neon branches create test-integration --parent development
DATABASE_URL=test-integration-url pnpm migrate
DATABASE_URL=test-integration-url pnpm test

# Cleanup
neon branches delete test-integration
```

#### **"Merge conflicts in migration files"**
```bash
# Never manually edit migration files to resolve conflicts
# Instead, rebase and regenerate:

git rebase main
# Resolve any non-migration conflicts
cd packages/database
rm -rf migrations
pnpm generate # Regenerate with current schema
```

---

**Next**: See [AI Agent Workflows](./ai-agent-workflows.md) for coordination with AI development.