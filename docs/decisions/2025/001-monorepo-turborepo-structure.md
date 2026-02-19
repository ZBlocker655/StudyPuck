# ADR-001: Monorepo Structure with Turborepo

**Date:** 2025-11-21  
**Status:** Accepted  
**Deciders:** @ZBlocker655  
**Technical Story:** Derived from [Monorepo Structure Design](../specs/monorepo-structure-design.md)

## Context and Problem Statement

StudyPuck will evolve from a single SvelteKit web application to potentially include desktop (Tauri), mobile applications, and shared libraries for components, types, and utilities. The project needs a repository structure that supports code sharing, atomic changes across platforms, and efficient development workflows while maintaining compatibility with Cloudflare Pages deployment.

## Decision Drivers

* **Code Sharing**: Components, types, utilities, and database schemas need to be shared across platforms
* **Atomic Changes**: UI/logic updates should be deployable across all platforms in a single commit
* **Developer Experience**: Single developer project needs efficient tooling and workflow
* **Deployment Compatibility**: Must work with Cloudflare Pages deployment requirements
* **Scalability**: Support for future desktop and mobile applications
* **Tooling Consistency**: Same TypeScript, testing, and build standards across all packages

## Considered Options

* **Option 1**: Monorepo with Turborepo
* **Option 2**: Polyrepo (separate repositories)
* **Option 3**: Monorepo with Nx
* **Option 4**: Simple monorepo with npm workspaces only

## Decision Outcome

**Chosen option:** **Monorepo with Turborepo**, because it provides optimal code sharing, supports atomic cross-platform changes, offers excellent developer experience for a single-developer project, and maintains full compatibility with Cloudflare Pages deployment.

### Positive Consequences

* **Efficient Code Sharing**: Easy imports between web/desktop/mobile applications
* **Atomic Refactoring**: Update card logic in one commit across all platforms
* **Simplified Tooling**: Single CI/CD, testing setup, and dependency management
* **Fast Builds**: Turborepo's intelligent caching and incremental builds
* **Type Safety**: Shared TypeScript types ensure consistency across platforms
* **Single Source of Truth**: Database schemas, utilities, and business logic in one place

### Negative Consequences

* **Repository Size**: Single repository will grow larger than individual repos
* **Build Complexity**: More complex build orchestration than simple single-app setup
* **Tool Learning Curve**: Turborepo-specific configuration and workflows

## Pros and Cons of the Options

### Option 1: Monorepo with Turborepo ✅

* Good, because intelligent build caching significantly speeds up development
* Good, because excellent monorepo tooling specifically designed for TypeScript projects
* Good, because supports incremental builds and selective rebuilding
* Good, because works seamlessly with pnpm and modern package managers
* Good, because great developer experience with task pipelines and parallelization
* Good, because proven at scale by companies like Vercel, Netflix, and others
* Bad, because adds some build complexity compared to simple single-app setup
* Bad, because learning curve for Turborepo-specific configuration

### Option 2: Polyrepo (Separate Repositories)

* Good, because simple individual repository setup
* Good, because complete isolation between projects
* Good, because easier to set different permissions/access controls
* Bad, because difficult to share code between web/desktop/mobile apps
* Bad, because atomic changes across platforms require multiple PRs
* Bad, because duplicated tooling setup across repositories
* Bad, because type inconsistencies between separate codebases
* Bad, because unsuitable for single-developer hobby project workflow

### Option 3: Monorepo with Nx

* Good, because powerful monorepo tooling with extensive plugin ecosystem
* Good, because supports multiple frameworks and build targets
* Good, because excellent dependency graph analysis and affected project detection
* Bad, because significant learning curve and configuration complexity
* Bad, because potentially overkill for hobby project scale
* Bad, because less TypeScript/Node.js focused than Turborepo
* Bad, because heavier tooling footprint

### Option 4: Simple Monorepo (npm workspaces only)

* Good, because minimal tooling complexity
* Good, because native npm/pnpm workspace support
* Good, because easy to understand and maintain
* Bad, because no intelligent build caching or optimization
* Bad, because manual task orchestration and dependency management
* Bad, because slower builds as project grows
* Bad, because less developer experience optimization

## Technical Implementation

### Repository Structure
```
StudyPuck/
├── apps/
│   ├── web/                    # SvelteKit web application
│   ├── desktop/               # Future: Tauri desktop app
│   └── mobile/                # Future: React Native/Capacitor
├── packages/
│   ├── database/              # Drizzle schema and migrations
│   ├── ui/                    # Shared Svelte components (future)
│   ├── types/                 # Shared TypeScript types (future)
│   └── utils/                 # Shared utilities (future)
├── docs/
├── turbo.json                 # Turborepo configuration
├── package.json               # Root package.json with workspaces
└── pnpm-workspace.yaml       # pnpm workspace configuration
```

### Build Configuration
```json
// turbo.json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".svelte-kit/**", ".vercel/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^lint"] },
    "test": { "dependsOn": ["^test"] }
  }
}
```

### Cloudflare Pages Deployment
**Verified Compatibility**: ✅ Cloudflare Pages supports monorepo deployments

```bash
# Web app deployment configuration
Root directory: /
Build command: pnpm turbo build --filter=web
Output directory: /apps/web/.svelte-kit/cloudflare
```

**Key Benefits**:
- Up to 5 Pages projects per repository
- Selective build triggers per app directory
- Build isolation for each application

## Migration and Evolution Path

### Phase 1: Current State ✅
- Single SvelteKit web app in `apps/web/`
- Database package in `packages/database/`
- Turborepo build orchestration

### Phase 2: Shared Libraries (Future)
- Extract shared components to `packages/ui/`
- Shared TypeScript types in `packages/types/`
- Common utilities in `packages/utils/`

### Phase 3: Multi-Platform (Future)
- Add `apps/desktop/` for Tauri application
- Add `apps/mobile/` for mobile application
- All sharing core business logic from packages

## Performance Characteristics

**Build Performance**:
- **Caching**: Turborepo cache prevents unnecessary rebuilds
- **Parallelization**: Independent packages build in parallel
- **Incremental**: Only changed packages rebuild

**Development Experience**:
- **Hot Reload**: Fast development server with selective rebuilding
- **Type Checking**: Shared types ensure consistency across all packages
- **Linting**: Consistent code quality across entire codebase

## Links

* [Turborepo Documentation](https://turbo.build/repo/docs)
* [Monorepo Structure Design Spec](../../specs/monorepo-structure-design.md)
* [Current turbo.json](../../../turbo.json)
* [pnpm Workspace Configuration](../../../pnpm-workspace.yaml)
* [Cloudflare Pages Monorepo Documentation](https://developers.cloudflare.com/pages/platform/build-configuration/)

## Implementation Status

* ✅ **Repository Structure**: Established with apps/ and packages/ directories
* ✅ **Turborepo Configuration**: Basic turbo.json with build, dev, lint tasks
* ✅ **pnpm Workspaces**: Configured for efficient dependency management
* ✅ **Cloudflare Deployment**: Verified compatibility with monorepo structure
* ⏳ **Enhanced Configuration**: Planned improvements with task dependencies and caching optimization
* ⏳ **Shared Packages**: Future extraction of UI components and utilities