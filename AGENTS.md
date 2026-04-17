# AI Development Rules for StudyPuck

**Purpose**: Essential guidelines for AI agents working on this codebase  
**Enforcement**: CRITICAL - Must follow for all code changes  
**Updated**: January 10, 2026

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
- **GitHub Issues**: When working on a specific issue, prefix with issue number:
  - `feature/15-auth-cloudflare-workers`
  - `fix/15-basepath-error`
  - `docs/15-auth-setup-guide`

## 🎯 **Implementation Philosophy**

### **Incremental Working Deployments**
Every implementation step must result in a deployable application that loads and functions at studypuck.app, even if limited in features. We favor working features over completed layers.

**Core Principle**: Instead of building complete backend then complete frontend, build working features that deploy at each milestone. Every step should result in something that loads and functions, even if limited.

**Deployment Strategy**: Each milestone must maintain studypuck.app as a working application with incremental feature additions.

## 📚 **Operational Documentation**

**CRITICAL**: All agents must follow the detailed operational procedures in `docs/ops/`. These procedures are mandatory for database management, deployment, and development workflows.

### **Choose the Right Workflow:**
- **[Interactive Development](docs/ops/interactive-development.md)** - For real-time human-AI collaboration (THIS session type!)
- **[Autonomous AI Development](docs/ops/autonomous-ai-development.md)** - For independent AI agents assigned to GitHub issues  
- **[Database Branching](docs/ops/database-branching-guide.md)** - Database branch management and migration procedures
- **[Environment Setup](docs/ops/environment-setup.md)** - Environment variable configuration across all platforms

### **Agent-Specific Requirements**

#### **For Copilot CLI (Interactive)**
```bash
# Verify environment before starting work
echo "Current DATABASE_URL: ${DATABASE_URL:0:20}..."

# Follow human-guided workflow in interactive-development.md
# Work collaboratively with human oversight
# Use existing database environment (typically development)
# Prefer secure local/Codespaces commands such as:
#   pnpm test:db:branch:secure
#   pnpm --filter @studypuck/database test:docker   # explicit local-only fast path
```

#### **For Cloud Copilot (Autonomous)**
```bash
# Automatic database branch creation on issue assignment
# Follow complete autonomous workflow in autonomous-ai-development.md
# Work in isolated agent/issue-N database branch
# Submit PR with complete implementation ready for human review
```

### **Critical Database Rules for All Agents**
- ⚠️ **ALWAYS use DIRECT connection strings for migrations** - pooled connections break migration tracking
- ✅ **Use database feature branches for schema changes** - prevents conflicts and pollution
- ✅ **Follow "Last Possible Moment" strategy** - development branch stays clean until production deployment
- 🔄 **Database branches automatically cleaned up** after PR merge/issue closure

### **Documentation Hierarchy**
```
docs/ops/README.md ←── Start here for overview
├── interactive-development.md ←── Human-AI collaboration (THIS session!)
├── autonomous-ai-development.md ←── Independent AI agents (MANDATORY)
├── manual-development.md ←── Human-only development
├── database-branching-guide.md ←── Database procedures (MANDATORY)
├── environment-setup.md ←── Environment configuration
└── troubleshooting.md ←── Common issues and solutions
```

**Rule**: When in doubt, consult `docs/ops/` documentation first. These procedures are authoritative and must be followed.

## 🔐 Varlock-Compatible Secret Handling

- Treat `.env.schema` as the committed source of truth for StudyPuck environment variables.
- Do **not** create or recommend a long-lived plaintext `apps/web/.env` file as the normal workflow.
- For varlock guidance, consult `https://varlock.dev/llms.txt` first; use `https://varlock.dev/llms-small.txt` for the abridged docs and `https://varlock.dev/llms-full.txt` for the complete docs when updating agent workflows or env-spec usage.
- StudyPuck's approved local/Codespaces varlock mechanism uses `exec()` in `.env.schema` to call the repo Bitwarden helper, preserving the "unlock Bitwarden once per shell session" UX.
- For local development and Codespaces, prefer the secure repo commands such as `pnpm env:check:secure`, `pnpm dev:secure`, `pnpm dev:workers:secure`, `pnpm db:migrate:secure`, and `pnpm db:studio:secure`.
- For local development and Codespaces, prefer `pnpm test:db:branch:secure` for `@studypuck/database` integration tests. Use `pnpm --filter @studypuck/database test:docker` only when you intentionally want the local Docker fast path.
- The approved local/Codespaces secret source is Bitwarden. Expect a Bitwarden item with custom fields named after the StudyPuck env vars.
- GitHub Actions and Cloudflare stay on platform-native env injection. Do not migrate production secrets into versioned files.
- Never print real secret values. Report variable names or masked presence only.
- When varlock is available in the executing environment, prefer `varlock load`, `varlock run`, and `varlock scan` around env/schema work.

## 🏗️ **Development Environments**

### **Standard Development (Node.js)**
```bash
pnpm dev  # Fast development with hot reload
```
- **Runtime**: Node.js 
- **URL**: http://localhost:5173
- **Best for**: UI development, rapid iteration, most features
- **Limitations**: May not catch Cloudflare Workers-specific issues

### **Cloudflare Workers Development** 
```bash
cd apps/web && pnpm dev:workers  # Production-like testing
```
- **Runtime**: Cloudflare Workers (V8 Isolates)
- **URL**: http://127.0.0.1:8788  
- **Best for**: Testing auth, deployment compatibility, edge cases
- **Limitations**: Requires rebuild on changes, slower feedback

### **When to Use Each**
- **Standard development**: Daily feature work, UI changes, quick testing
- **Workers development**: Auth debugging, pre-deployment testing, runtime-specific issues

## 🏗️ **Current Architecture Status**

### **Deployment Pipeline** ✅ PRODUCTION READY
- **GitHub Actions**: Testing only (lint + build verification)
- **Cloudflare Pages**: All deployments (main + preview branches)
- **Branch Protection**: Enforced with required status checks
- **Test Gating**: Failed tests block production deployment

### **Technology Stack** ✅ ESTABLISHED
- **Frontend**: SvelteKit + TypeScript + CUBE CSS
- **Backend**: Cloudflare Workers + Neon Postgres
- **Auth**: Auth0 + Auth.js
- **AI**: Google Gemini Flash (primary), GPT-4o-mini (secondary)
- **Testing**: Vitest + Playwright + Neon database branches
- **Validation**: Zod for schema validation and type safety
- **Monorepo**: PNPM + Turborepo

## 🎨 **Frontend CSS Architecture Rules**

### **Required Reading for Frontend Work**
- **Always review** `docs/specs/css-architecture-analysis.md` before making CSS architecture or component styling changes.
- **Always review** `docs/ux/visual-style-spec.md` before making visual design decisions involving typography, color, spacing, or surface treatment.

### **CUBE CSS Decision Order**
When building or revising frontend UI, apply CUBE CSS in this order:
1. **Semantic HTML first** - start with the most meaningful markup possible.
2. **Composition next** - solve layout with reusable composition classes before inventing component-specific layout CSS.
3. **Block after that** - use component styles for visual identity, state, and internal presentation.
4. **Utility sparingly** - use small utilities for single-purpose adjustments, not as the primary styling system.
5. **Exception rarely** - add explicit exceptions only when composition, block, and utilities do not solve the problem cleanly.

### **Responsibility Boundaries**
- **Compositions own layout only**: spacing, flow, alignment, distribution, width constraints, and responsive structure.
- **Blocks own component identity**: surface, borders, typography within the component, component-specific states, and ornamental styling.
- **Utilities stay tiny and obvious**: a utility should do one job and remain safe to combine with compositions and blocks.
- **Exceptions must be local and intentional**: avoid broad one-off overrides that silently reshape system behavior.

### **Operational Rules**
- Prefer an existing composition or utility before creating a new one.
- Do **not** let blocks re-own layout jobs that a composition should handle.
- Do **not** turn utilities into a utility-first free-for-all; if many utilities are needed together repeatedly, create or refine a composition or block instead.
- Use design tokens and CSS logical properties by default for new CSS.
- Treat current placeholder pages as **proof-of-concept targets only**. They may be lightly adapted to verify compositions, but they are **not** canonical StudyPuck layout patterns.

### **When Agents Must Consult the Human**
- When multiple CUBE-valid solutions are plausible and the choice will set a precedent for future UI work.
- When it is unclear whether something should be a composition, utility, block responsibility, or exception.
- When introducing a new composition pattern that could become part of the permanent design system.
- When visual direction is ambiguous even after consulting the visual style spec.
- When a placeholder-page convenience would risk becoming de facto permanent architecture.

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

### **Browser UI Testing Requirements**
- **Meaningful UI changes should include Playwright coverage** when they affect routing, auth-aware page flow, tabs/dialogs, navigation shell behavior, or multi-step interactions.
- **Do not require Playwright for trivial copy-only tweaks** with no behavior, routing, or interaction impact.
- **Prefer component/store tests for isolated logic**, but use browser tests when the behavior depends on SSR loads, redirects, real forms/actions, command-bar context, or cross-page navigation.
- **Keep browser tests on the real milestone flows** already in the product rather than on temporary throwaway placeholders.
- **Use the shared e2e harness** in `apps/web/tests/e2e/` instead of inventing per-spec auth or seed logic.

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

# Add comments to issues
gh issue comment 15 --body "Your comment text here"

# Add comments from file
gh issue comment 15 --body-file comment.md

# Set dependency relationship between issues
# NOT SUPPORTED in gh CLI. Instead, give human a quick list of issue->issue dependencies to manually set through GitHub.
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
# Canonical database-package integration tests (local/Codespaces secure flow)
pnpm test:db:branch:secure

# Optional local-only Docker fast path for database-package tests
pnpm --filter @studypuck/database test:docker

# Run linting (same as CI)
pnpm turbo lint --filter=web

# Run browser UI tests against an ephemeral Neon branch
pnpm test:e2e:secure

# Build verification (same as CI) 
pnpm turbo build --filter=web

# Run the standard web verification set
pnpm turbo test lint build --filter=web
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
