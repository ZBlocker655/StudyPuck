# AI Development Rules for StudyPuck

**Purpose**: Essential guidelines for AI agents working on this codebase  
**Enforcement**: CRITICAL - Must follow for all code changes  
**Updated**: January 8, 2026

## 🚨 MANDATORY WORKFLOW RULES

### **NEVER Push Directly to Main Branch**
- ✅ **ALWAYS create feature branch** for any code changes
- ✅ **ALWAYS use PR workflow** - no exceptions
- ❌ **NEVER `git push origin main`** - branch protection will reject it
- ❌ **NEVER bypass branch protection** - it exists for production safety

### **Required Development Workflow**
```bash
# ✅ CORRECT workflow for ALL changes:
git checkout -b feature/descriptive-name
# Make changes
git add . && git commit -m "descriptive message"  
git push -u origin feature/descriptive-name
# Create PR, wait for tests, then merge
```

### **Branch Naming Convention**
- **Features**: `feature/add-authentication`, `feature/user-profiles`
- **Bug fixes**: `fix/login-button-styling`, `fix/deploy-script-error`
- **Documentation**: `docs/update-readme`, `docs/api-documentation`
- **Refactoring**: `refactor/simplify-auth-flow`

## 🎯 **Implementation Philosophy**

### **Incremental Working Deployments**
Every implementation step must result in a deployable application that loads and functions at studypuck.app, even if limited in features. We favor working features over completed layers.

**Core Principle**: Instead of building complete backend then complete frontend, build working features that deploy at each milestone. Every step should result in something that loads and functions, even if limited.

**Deployment Strategy**: Each milestone must maintain studypuck.app as a working application with incremental feature additions.

## 🏗️ **Current Architecture Status**

### **Deployment Pipeline** ✅ PRODUCTION READY
- **GitHub Actions**: Testing only (lint + build verification)
- **Cloudflare Pages**: All deployments (main + preview branches)
- **Branch Protection**: Enforced with required status checks
- **Test Gating**: Failed tests block production deployment

### **Technology Stack** ✅ ESTABLISHED
- **Frontend**: SvelteKit + TypeScript + CUBE CSS
- **Backend**: Cloudflare Workers + D1 + KV
- **Auth**: Auth0 + Auth.js
- **AI**: Google Gemini Flash (primary), GPT-4o-mini (secondary)
- **Testing**: Vitest + Playwright
- **Validation**: Zod for schema validation and type safety
- **Monorepo**: PNPM + Turborepo

### **Project Structure**
```
StudyPuck/
├── apps/web/          # SvelteKit application
├── docs/              # Human documentation 
├── docs/requirements  # Application requirements
├── docs/specs         # Architecture specs and discussions 
├── .github/workflows/ # CI/CD pipeline
└── AGENTS.md          # This file
```

## ✅ **Before Making Changes**

1. **Check project requirements**: `docs/requirements/`
2. **Review architecture decisions**: `docs/specs/`
3. **Check GitHub Issues**: For current tasks and known issues (use `gh issue list` if authenticated)
4. **Understand the workflow**: Feature branch → PR → Tests pass → Merge
5. **Verify tests locally**: See build/test commands below

## 🛡️ **Production Safety Rules**

### **Testing Requirements**
- **All code changes** must pass GitHub Actions tests
- **Build verification** required before deployment
- **No failing tests** can reach main branch

### **Deployment Understanding**  
- **Cloudflare automatically deploys** main branch to studypuck.app
- **Feature branches get preview URLs** for testing
- **No manual deployment needed** - everything is automated

### **Emergency Procedures**
- **Broken main branch**: Revert via PR, never force push
- **Failed deployment**: Check Cloudflare Pages dashboard and GitHub Actions logs
- **Test failures**: Fix in feature branch, do not bypass

## 📚 **Essential Documentation Locations**

- **Project Requirements**: `docs/requirements/`
- **Architecture & Specs**: `docs/specs/`
- **Current Issues & Milestones**: GitHub Issues and Project Boards

## 🔧 **GitHub Issues & Project Management**

### **Accessing Issues and Milestones**
You may access GitHub Issues and Milestones through the `gh` CLI tool for project management tasks:

```bash
# View current issues
gh issue list

# View specific milestone
gh issue list --milestone "1.2 Authentication"

# View issue details  
gh issue view 15

# Create new issues (if needed)
gh issue create --title "Title" --body "Description"
```

### **Authentication Requirements**
If GitHub CLI is not authenticated, you will see an error like:
```
gh: Bad credentials (HTTP 401)
```

**Action Required**: Prompt the human to authenticate and await confirmation:
- Ask: "Please run `gh auth login` to authenticate with GitHub and confirm when ready"
- Wait for human confirmation before proceeding with GitHub CLI commands
- Do not attempt GitHub CLI operations without confirmed authentication

## 🏗️ **Turborepo Best Practices**

### **Current State vs. Best Practices**
Our current setup works but can be enhanced with Vercel's official best practices:

#### **High Priority Improvements**
- **Enhanced turbo.json**: Add task dependencies (`"dependsOn": ["^build"]`)
- **Shared eslint-config**: Create `packages/eslint-config` for consistent linting
- **Better caching**: Include `.env*` files in cache inputs

#### **Implementation Strategy**
- **Phase 1** (During auth work): Apply immediate turbo.json improvements
- **Phase 2** (During database setup): Add shared configuration packages  
- **Phase 3** (During testing): Implement enhanced tooling (Playwright + Vitest)
- **Phase 4** (Post core features): Full shared packages and advanced workflows

#### **Enhanced turbo.json Template**
```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".svelte-kit/**", ".vercel/**"]
    },
    "lint": { "dependsOn": ["^lint"] },
    "check-types": { "dependsOn": ["^check-types"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

### **Shared Package Structure (Future)**
```
packages/
├── eslint-config/          # Shared ESLint rules
├── typescript-config/      # Shared TypeScript configs  
└── ui/                     # Shared Svelte components
```

## 🔧 **Common Build/Test Commands**

### **Development Setup**
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Start development server for specific app
cd apps/web && pnpm dev
```

### **Testing & Linting**
```bash
# Run linting (same as CI)
pnpm turbo lint --filter=web

# Build verification (same as CI) 
pnpm turbo build --filter=web

# Run all tasks for web app
pnpm turbo dev lint build --filter=web
```

### **Project Management**
```bash
# Install new dependency to web app
cd apps/web && pnpm add package-name

# Install dev dependency to web app
cd apps/web && pnpm add -D package-name

# Update all dependencies
pnpm update --recursive
```

## ❗ **Common Mistakes to Avoid**

1. **Pushing to main**: Always use feature branches
2. **Skipping tests**: Tests are not optional - they protect production
3. **Manual deployment**: Everything is automated via Cloudflare
4. **Force pushing**: Breaks history and bypasses protection
5. **Ignoring PR feedback**: Status checks exist for a reason
6. **Breaking incremental deployments**: Each change should maintain working app at studypuck.app

## 🤝 **Working with Human Developer**

- **Respect the workflow**: Use PRs even for small changes
- **Document decisions**: Update relevant docs when making architectural changes  
- **Test thoroughly**: Both automated tests and manual verification
- **Ask for clarification**: When implementation details are unclear

---

**Remember**: This production system serves real users at studypuck.app. 
Always prioritize stability and follow the established workflow.
