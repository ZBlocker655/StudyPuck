# GitHub Actions Setup Guide

**Purpose**: Complete CI/CD pipeline configuration for StudyPuck with database integration.

## Current GitHub Actions Status

### **Existing Workflows**
```bash
# Check current workflows
ls .github/workflows/

# Expected files:
test.yml              # Linting and build verification (active)
```

### **Required Workflows (To Be Implemented)**
```bash
agent-setup.yml       # Automatic agent environment creation
agent-cleanup.yml     # Automatic agent environment cleanup  
deploy.yml            # Production deployment with database migrations
preview-deploy.yml    # Preview deployment (manual trigger)
```

## Test Workflow Configuration

### **Current Test Workflow (.github/workflows/test.yml)**
```yaml
name: Test & Validate
on: 
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js & Dependencies
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    - run: pnpm install
    
    # TODO: Add database testing with ephemeral branches
    # See "Enhanced Test Workflow" section below
      
    - name: Run full test suite
      run: |
        pnpm turbo lint --filter=web
        pnpm turbo check-types --filter=web
        pnpm turbo build --filter=web
        # TODO: Add pnpm turbo test --filter=web when tests exist
```

### **Enhanced Test Workflow (Recommended Implementation)**
```yaml
name: Test & Validate
on: 
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js & Dependencies
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    - run: pnpm install
      
    - name: Install Neon CLI
      run: npm install -g neonctl
      
    - name: Create ephemeral test database
      id: create_db
      env:
        NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
      run: |
        # Create test branch from clean development baseline
        BRANCH_NAME="test-${{ github.sha }}"
        echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT
        
        neonctl branches create $BRANCH_NAME --parent development
        TEST_DB_URL=$(neonctl connection-string $BRANCH_NAME)
        echo "::add-mask::$TEST_DB_URL"
        echo "test_db_url=$TEST_DB_URL" >> $GITHUB_OUTPUT
    
    - name: Apply all migrations (idempotent)
      env:
        DATABASE_URL: ${{ steps.create_db.outputs.test_db_url }}
      run: |
        # Apply all migrations from development + any new ones in PR
        cd packages/database
        pnpm migrate  # Idempotent - only new migrations apply
        
    - name: Run full test suite
      env:
        DATABASE_URL: ${{ steps.create_db.outputs.test_db_url }}
      run: |
        pnpm turbo lint --filter=web
        pnpm turbo check-types --filter=web
        pnpm turbo test --filter=web
        pnpm turbo build --filter=web
      
    - name: Cleanup ephemeral database
      if: always()
      env:
        NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
      run: |
        neonctl branches delete ${{ steps.create_db.outputs.branch_name }} --force
```

## Agent Automation Workflows

### **Agent Setup Workflow (.github/workflows/agent-setup.yml)**
```yaml
name: Setup Agent Environment
on:
  issues:
    types: [assigned]

jobs:
  setup-agent-env:
    if: contains(github.event.assignee.login, 'copilot') || contains(github.event.assignee.login, 'agent')
    runs-on: ubuntu-latest
    
    steps:
    - name: Install Neon CLI
      run: npm install -g neonctl
      
    - name: Create agent database branch
      env:
        NEON_API_KEY: ${{ secrets.AGENT_NEON_API_KEY }}
      run: |
        BRANCH_NAME="agent/issue-${{ github.event.issue.number }}"
        echo "Creating database branch: $BRANCH_NAME"
        
        # Create branch from development baseline
        neonctl branches create $BRANCH_NAME --parent development
        
        echo "✅ Agent database branch created: $BRANCH_NAME" >> $GITHUB_STEP_SUMMARY
        
    - name: Comment setup completion
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      run: |
        gh issue comment ${{ github.event.issue.number }} --body "🤖 **Agent Environment Ready**
        
        Database branch created: \`agent/issue-${{ github.event.issue.number }}\`
        
        **Agent Instructions:**
        1. Create git branch: \`agent/issue-${{ github.event.issue.number }}-implementation\`
        2. Use isolated database for development
        3. Submit PR when implementation is complete
        4. Environment will be cleaned up automatically when issue is closed
        
        See [AI Agent Workflows](docs/ops/ai-agent-workflows.md) for complete procedures."
```

### **Agent Cleanup Workflow (.github/workflows/agent-cleanup.yml)**
```yaml
name: Cleanup Agent Environment
on:
  issues:
    types: [closed]
  pull_request:
    types: [closed]

jobs:
  cleanup-agent-env:
    if: |
      (github.event_name == 'issues' && contains(github.event.issue.assignee.login, 'copilot')) ||
      (github.event_name == 'pull_request' && startsWith(github.head_ref, 'agent/'))
    runs-on: ubuntu-latest
    
    steps:
    - name: Install Neon CLI
      run: npm install -g neonctl
      
    - name: Delete agent database branch
      env:
        NEON_API_KEY: ${{ secrets.AGENT_NEON_API_KEY }}
      run: |
        if [ "${{ github.event_name }}" == "issues" ]; then
          BRANCH_NAME="agent/issue-${{ github.event.issue.number }}"
          ISSUE_NUM=${{ github.event.issue.number }}
        else
          BRANCH_NAME="${{ github.head_ref }}"
          ISSUE_NUM=${{ github.event.pull_request.number }}
        fi
        
        echo "Deleting database branch: $BRANCH_NAME"
        neonctl branches delete $BRANCH_NAME --force || echo "Branch may not exist"
        
        echo "✅ Agent database branch deleted: $BRANCH_NAME" >> $GITHUB_STEP_SUMMARY
        
    - name: Comment cleanup completion
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      run: |
        if [ "${{ github.event_name }}" == "issues" ]; then
          ISSUE_NUM=${{ github.event.issue.number }}
        else
          ISSUE_NUM=${{ github.event.pull_request.number }}
        fi
        
        gh issue comment $ISSUE_NUM --body "🧹 **Agent Environment Cleaned Up**
        
        Database branch deleted and resources freed.
        
        Agent work for this issue is complete."
```

## Production Deployment Workflow

### **Production Deployment (.github/workflows/deploy.yml)**
```yaml
name: Deploy Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js & Dependencies
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    - run: pnpm install
      
    - name: Apply migrations to production database
      env:
        DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
      run: |
        cd packages/database
        pnpm migrate  # Apply any new migrations to production
        
    - name: Wait for Cloudflare deployment
      run: |
        echo "Waiting for Cloudflare Pages auto-deployment to complete..."
        # Cloudflare auto-deploys from main branch (existing behavior)
        # Add monitoring/waiting logic here if needed
        sleep 30
        
    - name: Verify production deployment
      run: |
        # Health check against live site
        curl -f https://studypuck.app/ || exit 1
        echo "✅ Production deployment verified"
        
    - name: Sync development branch (Last Possible Moment)
      env:
        NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
      run: |
        # NOW we update development to match production
        neonctl branches reset development --parent production
        echo "✅ Development branch synced to production state"
        
    - name: Notify deployment success
      if: success()
      run: |
        echo "🚀 **Production Deployment Complete**
        
        - Database migrations applied ✅
        - Cloudflare deployment verified ✅  
        - Development branch synced ✅
        
        StudyPuck is updated at https://studypuck.app" >> $GITHUB_STEP_SUMMARY
        
    - name: Notify deployment failure
      if: failure()
      run: |
        echo "❌ **Production Deployment Failed**
        
        Check workflow logs for details.
        Development branch NOT synced - manual intervention required." >> $GITHUB_STEP_SUMMARY
```

## Required GitHub Secrets

### **Repository Secrets Setup**
Navigate to: **Repository Settings → Secrets and variables → Actions → Repository secrets**

```bash
# Database Management
NEON_API_KEY          # Full API access for production operations
AGENT_NEON_API_KEY    # Limited scope for agent branch creation/deletion
DEV_DATABASE_URL      # Development database connection (direct)
PROD_DATABASE_URL     # Production database connection (direct)

# Deployment
CLOUDFLARE_API_TOKEN  # For deployment management (if needed)

# Note: GITHUB_TOKEN is automatically provided
```

### **Secret Configuration Examples**
```bash
# NEON_API_KEY (full access)
neon_1234567890abcdef1234567890abcdef1234567890abcdef

# AGENT_NEON_API_KEY (limited scope - branch create/delete only)
neon_0987654321fedcba0987654321fedcba0987654321fedcba

# DEV_DATABASE_URL (direct connection)
postgresql://user:pass@ep-development.region.aws.neon.tech/db?sslmode=require

# PROD_DATABASE_URL (direct connection)  
postgresql://user:pass@ep-production.region.aws.neon.tech/db?sslmode=require
```

### **Secret Security Best Practices**
- ✅ **Rotate API keys** quarterly or if compromised
- ✅ **Use limited scope keys** for agent operations
- ✅ **Never log sensitive values** - GitHub masks them automatically
- ✅ **Use environment protection rules** for production deployments

## Workflow Testing & Validation

### **Test GitHub Actions Locally**
```bash
# Install act for local GitHub Actions testing
# https://github.com/nektos/act

# Test workflow locally (requires Docker)
act pull_request

# Test specific job
act pull_request -j test

# Test with secrets file
echo "DATABASE_URL=test-url" > .secrets
act pull_request -s .secrets
```

### **Validate Workflows Before Deployment**
```bash
# Syntax validation
gh workflow list

# Check workflow syntax
gh workflow view test.yml

# Validate YAML syntax
yamllint .github/workflows/*.yml
```

### **Monitor Workflow Execution**
```bash
# View recent workflow runs
gh run list

# View specific workflow run
gh run view [run-id] --log

# Re-run failed workflow
gh run rerun [run-id]
```

## Troubleshooting GitHub Actions

### **Common Issues**

#### **"NEON_API_KEY not found"**
```bash
# Check secret configuration
# Repository Settings → Secrets and variables → Actions
# Verify secret name matches workflow file exactly
```

#### **"Cannot create database branch"**
```bash
# Check API key permissions
# AGENT_NEON_API_KEY needs branch create/delete permissions
# NEON_API_KEY needs full project access
```

#### **"Migration failed in production"**
```bash
# Check migration file syntax
cd packages/database
pnpm generate # Should not produce new files if schema unchanged

# Test migration locally first
DATABASE_URL=$PROD_DATABASE_URL pnpm migrate
```

#### **"Workflow hangs or times out"**
```bash
# Common causes:
# - Neon API rate limiting
# - Network connectivity issues
# - Migration taking too long

# Solutions:
# - Add timeout limits to steps
# - Implement retry logic
# - Break large migrations into smaller parts
```

### **Debug Commands for Workflows**
```yaml
# Add debugging steps to workflows
- name: Debug environment
  run: |
    echo "Node version: $(node --version)"
    echo "Npm version: $(npm --version)"
    echo "Database URL set: $([[ -n "$DATABASE_URL" ]] && echo "yes" || echo "no")"
    neonctl branches list | head -5

- name: Debug database connection
  run: |
    cd packages/database
    timeout 30 pnpm migrate || echo "Migration timed out"
```

## Workflow Monitoring & Maintenance

### **Regular Maintenance Tasks**
```bash
# Weekly: Review workflow execution times
gh run list --limit 20

# Monthly: Update workflow dependencies
# - Update action versions (@v4 → @v5)
# - Update Node.js version
# - Review secret rotation schedule

# Quarterly: Review and optimize workflows
# - Remove unused secrets
# - Optimize workflow execution time
# - Update documentation
```

### **Performance Optimization**
```bash
# Cache optimization
uses: actions/setup-node@v4
with:
  cache: 'pnpm'          # Cache pnpm dependencies
  cache-dependency-path: 'pnpm-lock.yaml'

# Parallel job execution
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20]  # Test multiple Node versions
```

---

**Next**: See [Production Deployment](./production-deployment.md) for complete deployment procedures.