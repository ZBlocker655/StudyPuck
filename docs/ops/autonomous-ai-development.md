# AI Agent Workflows

**Purpose**: Complete operational procedures for AI agents (including Copilot CLI) working on StudyPuck features.

## Agent Types & Contexts

### **Copilot CLI (Interactive)**
- **Context**: Human-guided terminal sessions
- **Database Access**: Uses current environment variables
- **Workflow**: Collaborative with human oversight
- **Cleanup**: Manual coordination with human

### **Cloud Copilot (Autonomous)**  
- **Context**: GitHub issue assignment → automatic branch creation
- **Database Access**: Isolated agent database branch
- **Workflow**: Fully automated with human review
- **Cleanup**: Automatic on issue closure

## Copilot CLI Workflow (Human-Agent Collaboration)

### **Phase 1: Environment Setup**
```bash
# Agent verifies current environment
echo "Current DATABASE_URL: ${DATABASE_URL:0:20}..."

# Check database connectivity
cd packages/database
pnpm migrate:apply # Should succeed without errors
```

### **Phase 2: Feature Development**
```bash
# Agent works in current environment (typically development branch)
# No automatic branch creation - human decides database strategy

# For simple changes: use development database
DATABASE_URL=$DEV_DATABASE_URL

# For complex schema changes: human creates feature branch
# Human: neon branches create feature/issue-45 --parent development
# Agent: works with provided connection string
```

### **Phase 3: Testing & Validation**
```bash
# Agent runs the canonical database-package tests plus app tests
pnpm --filter @studypuck/database test
pnpm turbo test --filter=web

# Docker remains an explicit local-only escape hatch, not the agent default:
# pnpm --filter @studypuck/database test:docker
```

### **Phase 4: Documentation & Handoff**
```bash
# Agent documents changes made
echo "## Changes Made" > implementation-summary.md
echo "- [list of changes]" >> implementation-summary.md

# Agent provides next steps for human
echo "## Human Actions Required" >> implementation-summary.md
echo "- Review database changes" >> implementation-summary.md
echo "- Test feature integration" >> implementation-summary.md
```

## Cloud Copilot Workflow (Autonomous)

### **Automatic Agent Setup Trigger**
```yaml
# .github/workflows/agent-setup.yml
name: Setup Agent Environment
on:
  issues:
    types: [assigned]

jobs:
  setup-agent-env:
    if: contains(github.event.assignee.login, 'copilot') || contains(github.event.assignee.login, 'agent')
    runs-on: ubuntu-latest
    steps:
    - name: Create agent database branch
      env:
        NEON_API_KEY: ${{ secrets.AGENT_NEON_API_KEY }}
      run: |
        BRANCH_NAME="agent/issue-${{ github.event.issue.number }}"
        echo "Creating database branch: $BRANCH_NAME"
        neonctl branches create $BRANCH_NAME --parent development
        
    - name: Comment setup completion
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      run: |
        gh issue comment ${{ github.event.issue.number }} --body "🤖 Agent environment created: \`agent/issue-${{ github.event.issue.number }}\` database branch ready for development."
```

### **Agent Development Process**
```bash
# Agent receives environment automatically
AGENT_DATABASE_URL="postgresql://...@agent-issue-45.example.neon.tech/db"
ISSUE_NUMBER=45

# Step 1: Create git branch
git checkout -b agent/issue-45-implementation

# Step 2: Apply existing migrations to catch up
cd packages/database
DATABASE_URL=$AGENT_DATABASE_URL pnpm migrate:apply

# Step 3: Develop feature in complete isolation
# - Create new migrations if needed
# - Test feature thoroughly
# - Ensure no dependencies on external state

# Step 4: Validate implementation
DATABASE_URL=$AGENT_DATABASE_URL NEON_API_KEY=$NEON_API_KEY pnpm --filter @studypuck/database test
pnpm turbo lint check-types test build --filter=web

# Step 5: Submit PR with complete implementation
git add .
git commit -m "Implement feature for issue #45

- [detailed list of changes]
- Tested in isolated environment
- Ready for human review"

git push origin agent/issue-45-implementation
```

### **Agent PR Requirements**
Agent PRs must include:

#### **Code Changes**
- ✅ Complete feature implementation
- ✅ Database migrations (if needed)
- ✅ Type safety maintained
- ✅ Linting passes

#### **Documentation**
- ✅ Clear commit messages
- ✅ PR description explaining implementation
- ✅ Database changes documented
- ✅ Testing approach described

#### **Testing Evidence**
- ✅ All tests pass in isolated environment
- ✅ Build succeeds
- ✅ Database migrations applied cleanly
- ✅ No breaking changes to existing functionality

## Agent Database Branch Management

### **Branch Naming Convention**
```
agent/issue-{NUMBER} 
```
Examples: `agent/issue-45`, `agent/issue-123`

### **Branch Lifecycle**
```bash
# Creation (automatic via GitHub Actions)
neonctl branches create agent/issue-45 --parent development

# Usage during development
DATABASE_URL="postgresql://...@agent-issue-45.example.neon.tech/db"

# Cleanup after PR merge/close (automatic)
neonctl branches delete agent/issue-45 --force
```

### **Branch Isolation Rules**
- ✅ **Complete isolation**: Agent branch has no dependencies on other feature branches
- ✅ **Development baseline**: Always branched from clean development state
- ✅ **No data sharing**: Each agent works with independent database state
- ✅ **Migration independence**: Agent can apply migrations without conflicts

## Agent Cleanup Procedures

### **Automatic Cleanup Trigger**
```yaml
# .github/workflows/agent-cleanup.yml
name: Cleanup Agent Environment
on:
  issues:
    types: [closed]
  pull_request:
    types: [closed]

jobs:
  cleanup-agent-env:
    if: startsWith(github.head_ref, 'agent/') || contains(github.event.issue.assignee.login, 'copilot')
    runs-on: ubuntu-latest
    steps:
    - name: Delete agent database branch
      env:
        NEON_API_KEY: ${{ secrets.AGENT_NEON_API_KEY }}
      run: |
        if [ "${{ github.event_name }}" == "issues" ]; then
          BRANCH_NAME="agent/issue-${{ github.event.issue.number }}"
        else
          BRANCH_NAME="${{ github.head_ref }}"
        fi
        echo "Deleting database branch: $BRANCH_NAME"
        neonctl branches delete $BRANCH_NAME --force || echo "Branch may not exist"
        
    - name: Comment cleanup completion
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      run: |
        ISSUE_NUM="${{ github.event.issue.number || github.event.pull_request.number }}"
        gh issue comment $ISSUE_NUM --body "🧹 Agent environment cleaned up: database branch deleted."
```

### **Manual Cleanup (Emergency)**
```bash
# List all agent branches
neonctl branches list | grep "agent/"

# Delete specific agent branch
neonctl branches delete agent/issue-45 --force

# Delete multiple agent branches (cleanup old branches)
neonctl branches list | grep "agent/" | xargs -I {} neonctl branches delete {} --force
```

## Agent Best Practices

### **Database Operations**
```bash
# DO: Always verify migrations work before submitting PR
cd packages/database
DATABASE_URL=$AGENT_DATABASE_URL pnpm migrate:apply

# DO: Treat the package branch workflow as canonical
DATABASE_URL=$AGENT_DATABASE_URL NEON_API_KEY=$NEON_API_KEY pnpm --filter @studypuck/database test

# DO: Test with clean schema state
# Agent branches start from development baseline

# DON'T: Assume external database state
# Each agent branch is completely isolated

# DON'T: Manually create database branches
# Use automatic GitHub Actions setup
```

### **Code Organization**
```bash
# DO: Create focused, single-purpose changes
git commit -m "Add user authentication feature

- Implement Auth0 integration
- Add user session management  
- Update database schema with user tables
- Add authentication middleware"

# DON'T: Make unrelated changes in same PR
# Focus on specific issue assignment
```

### **Error Handling**
```bash
# DO: Check command success before proceeding
if ! pnpm migrate:apply; then
  echo "Migration failed - aborting feature development"
  exit 1
fi

# DO: Provide clear error context
echo "Failed to connect to agent database branch"
echo "Branch: agent/issue-45"
echo "URL: ${AGENT_DATABASE_URL:0:30}..."

# DON'T: Continue with broken database state
# Always validate environment before feature work
```

### **Communication**
```bash
# DO: Update issue with progress
gh issue comment $ISSUE_NUMBER --body "🤖 Starting implementation of feature X
- Created isolated database branch
- Applied baseline migrations
- Beginning feature development"

# DO: Document significant decisions
gh issue comment $ISSUE_NUMBER --body "🤖 Implementation decision: Using Auth0 instead of custom auth
- Reason: Faster integration
- Impact: Requires Auth0 environment variables
- Testing: Validated in isolated environment"

# DON'T: Work silently
# Keep human reviewers informed of progress
```

## Agent Troubleshooting

### **Common Issues**

#### **"Cannot create database branch"**
```bash
# Check AGENT_NEON_API_KEY permissions
neonctl auth show

# Verify parent branch exists
neonctl branches list | grep development

# Solution: Verify API key has branch creation permissions
```

#### **"Migration tracking errors"**
```bash
# Expected behavior - see database-branching-guide.md
# Continue with development, tracking is non-critical

# Verify schema was applied correctly
psql $AGENT_DATABASE_URL -c "\dt" # List tables
```

#### **"Environment variables not found"**
```bash
# Check GitHub Actions setup
echo "AGENT_DATABASE_URL: ${AGENT_DATABASE_URL:0:20}..."

# Verify issue assignment triggered workflow
gh run list --workflow=agent-setup.yml
```

#### **"Tests failing in isolated environment"**
```bash
# Check for external dependencies
# Agent environments should be completely self-contained

# Verify test data setup
# Tests should create their own test data, not rely on existing data
```

### **Debug Commands**
```bash
# Check agent database branch status
neonctl branches get agent/issue-45

# Verify database connectivity
psql $AGENT_DATABASE_URL -c "SELECT NOW();"

# Check migration state
psql $AGENT_DATABASE_URL -c "\dt" # Should show all expected tables

# Validate environment setup
env | grep -E "(DATABASE|NEON|AGENT)" | sort
```

## Agent Success Criteria

### **Minimum Requirements**
- ✅ Feature implemented according to issue requirements
- ✅ All tests pass in isolated environment
- ✅ No breaking changes to existing functionality
- ✅ Database schema changes (if any) properly migrated
- ✅ Code follows project conventions and passes linting

### **Quality Indicators**
- ✅ Clear, well-documented implementation
- ✅ Comprehensive test coverage for new features
- ✅ Proper error handling and edge case coverage
- ✅ Performance considerations addressed
- ✅ Security best practices followed

### **Handoff to Human**
- ✅ PR ready for human review
- ✅ Implementation summary provided
- ✅ Testing approach documented
- ✅ Any limitations or future work identified
- ✅ Database branch ready for cleanup after merge

---

**Next**: See [Production Deployment](./production-deployment.md) for deployment procedures after agent work is merged.
