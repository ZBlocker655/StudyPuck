# Interactive Development Workflows

**Scenario**: Human directing AI assistant in real-time sessions (Copilot CLI, ChatGPT, etc.)  
**Control Pattern**: Human provides direction → AI executes technical tasks  
**Database Strategy**: Collaborative branching with human oversight

## 🎯 **When to Use This Workflow**

### **✅ This Workflow Applies When:**
- Human working with AI assistant in real-time (like this session!)
- Human makes strategic decisions, AI handles implementation
- Interactive problem-solving and iterative development
- Human reviews and approves each step before proceeding

### **❌ Use Other Workflows When:**
- **Autonomous AI**: AI assigned to work independently on GitHub issues
- **Manual Development**: Human working alone without AI assistance
- **Production Deployment**: Following established deployment procedures

## 🏗️ **Interactive Development Process**

### **Phase 1: Project Setup and Planning**

#### **Human Responsibilities:**
```bash
# 1. Define the goal and scope
"Let's implement user authentication with Auth0"

# 2. Make strategic decisions
"Use the development database branch for this work"

# 3. Provide project context
"This relates to Issue #23, depends on Issue #21 completion"
```

#### **AI Responsibilities:**
```bash
# 1. Analyze current state
gh issue view 23  # Check issue requirements
git status        # Check repository state

# 2. Identify dependencies and blockers
# 3. Propose technical implementation approach
# 4. Ask clarifying questions when needed
```

### **Phase 2: Database and Environment Setup**

#### **Database Branch Strategy:**
```bash
# Human decides: Use existing development branch
DATABASE_URL="postgresql://...@ep-development.region.aws.neon.tech/db"

# Or Human decides: Create feature branch for experimental work  
neon branches create feature/auth-implementation --parent development
DATABASE_URL="postgresql://...@ep-feature-auth.region.aws.neon.tech/db"
```

#### **Environment Configuration:**
```bash
# AI sets up local environment using established patterns
# Human reviews and approves environment choices
echo "DATABASE_URL=..." >> .env
```

### **Phase 3: Implementation with Human Oversight**

#### **Iterative Development Pattern:**
1. **Human**: "Create the user schema migration"
2. **AI**: Implements migration, shows code for review
3. **Human**: "That looks good, now run it"
4. **AI**: Executes migration, reports results
5. **Human**: "Great! Now implement the user service"
6. *Repeat pattern for each component*

#### **Key Principles:**
- **Human approval**: AI asks before major changes or destructive operations
- **Show work**: AI explains what it's doing and why
- **Incremental progress**: Break work into reviewable chunks
- **Safety checks**: AI warns about potentially risky operations

### **Phase 4: Testing and Validation**

#### **Human-Directed Testing:**
```bash
# Human: "Test the user creation flow"
# AI: Implements test, runs it, reports results

# Human: "Now test the authentication"
# AI: Creates auth test, runs it, shows output
```

#### **Validation Steps:**
- **Functionality testing**: Core features work as expected
- **Database verification**: Schema and data correct
- **Integration testing**: Components work together
- **Human acceptance**: Final review and approval

### **Phase 5: Completion and Cleanup**

#### **Human Responsibilities:**
```bash
# Strategic decisions about next steps
"This looks good, let's create a PR"
"Hold off on deployment until Issue #35 is complete"
"Clean up the development database for next feature"
```

#### **AI Responsibilities:**
```bash
# Technical cleanup
git add . && git commit -m "Implement user authentication"
git push -u origin feature/auth-implementation

# If a Neon feature branch was created for this work, delete it AFTER the PR merges:
neonctl branches delete feature/issue-N
# Note: the production deploy workflow auto-deletes this on merge,
# but if you need to do it manually (e.g. deploy failed or was skipped):
#   $env:PATH = "C:\Users\Zach\AppData\Roaming\npm;" + $env:PATH
#   neonctl branches delete feature/issue-N

# Revert apps/web/.env DATABASE_URL back to development branch
# (uncomment development line, remove feature branch line)

# Documentation updates
# Report completion status
# Propose next steps
```

## 🔧 **Database Management in Interactive Sessions**

### **Branch Selection Guidelines:**

#### **✅ Use Development Branch When:**
- Working on established features with clear requirements
- Building on completed foundational work  
- Low risk of breaking changes
- Multiple developers might need the changes

#### **✅ Use Feature Branch When:**
- Experimental or exploratory work
- Potentially breaking changes
- Complex migrations that need testing
- Long-running development that might conflict with others

#### **🤝 Decision Process:**
1. **AI recommends** branch strategy based on work scope
2. **Human decides** which approach to use
3. **AI implements** the chosen strategy
4. **Both monitor** for issues and adjust as needed

### **Migration Workflow:**

#### **Safe Migration Pattern:**
```bash
# 1. AI generates migration
pnpm migrate:generate

# 2. AI shows migration to human for review
cat packages/database/migrations/0001_create_users.sql

# 3. Human approves or requests changes
# "That looks good, apply it"

# 4. AI applies migration
pnpm migrate:apply

# 5. AI verifies migration succeeded
# Check database state, run basic queries
```

#### **Rollback Safety:**
```bash
# If something goes wrong:
# 1. AI immediately reports the issue
# 2. Human decides rollback strategy
# 3. AI implements rollback (drop tables, restore backup, etc.)
# 4. Both review what went wrong and adjust approach
```

## 📋 **Communication Patterns**

### **Effective Human Direction:**
```bash
# ✅ Clear objectives
"Implement user profile management with automatic creation on login"

# ✅ Strategic constraints  
"Use the development database, don't create new branches yet"

# ✅ Quality requirements
"Make sure to include proper error handling and validation"

# ✅ Checkpoint requests
"Show me the migration before running it"
```

### **Effective AI Responses:**
```bash
# ✅ Clarifying questions
"Should I create a new migration or modify the existing one?"

# ✅ Progress updates
"Migration created successfully. Here's what it does: [explanation]"

# ✅ Risk warnings
"This migration will drop the existing users table. Should I proceed?"

# ✅ Status reports
"User service implemented. Ready to test user creation flow."
```

## 🚨 **Safety Guidelines**

### **Mandatory Human Approval For:**
- **Destructive operations**: DROP tables, DELETE data
- **Production changes**: Any modification to production database
- **Breaking changes**: Schema changes that affect existing code  
- **Major architectural decisions**: New dependencies, structure changes

### **AI Can Proceed Independently For:**
- **Safe schema additions**: New tables, columns (with proper defaults)
- **Code implementation**: Following established patterns
- **Testing**: Running tests, checking functionality
- **Documentation**: Updating docs, comments, README files

### **Emergency Procedures:**
- **If something breaks**: AI immediately stops and reports
- **If data is lost**: AI helps human assess damage and recovery options
- **If conflicts arise**: AI defers to human judgment on resolution

---

**Key Principle**: Interactive development leverages the strengths of both human strategic thinking and AI technical execution while maintaining human oversight of critical decisions.