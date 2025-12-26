# AI Development Rules for StudyPuck

**Purpose**: Essential guidelines for AI agents working on this codebase  
**Enforcement**: CRITICAL - Must follow for all code changes  
**Updated**: December 26, 2024

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

## 🏗️ **Current Architecture Status**

### **Deployment Pipeline** ✅ PRODUCTION READY
- **GitHub Actions**: Testing only (lint + build verification)
- **Cloudflare Pages**: All deployments (main + preview branches)
- **Branch Protection**: Enforced with required status checks
- **Test Gating**: Failed tests block production deployment

### **Project Structure**
```
StudyPuck/
├── apps/web/          # SvelteKit application
├── docs/              # Human documentation  
├── .github/workflows/ # CI/CD pipeline
└── AGENTS.md          # This file
```

## ✅ **Before Making Changes**

1. **Read current implementation status**: `docs/implementation/README.md`
2. **Check project requirements**: `docs/requirements/`
3. **Review architecture decisions**: `docs/specs/`
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
- **Implementation Guide**: `docs/implementation/README.md`
- **Deployment Pipeline**: `docs/implementation/guides/deployment-pipeline-best-practices.md`
- **Setup Instructions**: `docs/implementation/setup/`
- **Progress Tracking**: `docs/implementation/progress-checklist.md`

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

## 🤝 **Working with Human Developer**

- **Respect the workflow**: Use PRs even for small changes
- **Document decisions**: Update relevant docs when making architectural changes  
- **Test thoroughly**: Both automated tests and manual verification
- **Ask for clarification**: When implementation details are unclear

---

**Remember**: This production system serves real users at studypuck.app. 
Always prioritize stability and follow the established workflow.