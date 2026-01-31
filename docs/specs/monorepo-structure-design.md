# Monorepo Structure Design

## Project Context
StudyPuck will grow from a single SvelteKit web app to potentially include desktop (Tauri) and mobile applications, plus shared libraries for components, types, and utilities. This analysis evaluates monorepo vs polyrepo strategies and designs the optimal structure.

## Monorepo vs Polyrepo Analysis

### Should StudyPuck Use a Monorepo?

**StudyPuck characteristics**:
- **Tightly integrated apps**: Web, desktop, mobile will share core language learning logic
- **Shared codebase**: Components, types, utilities, database schemas
- **Single team**: Hobby project, no team autonomy concerns
- **Atomic changes**: UI/logic updates should apply across all platforms
- **Common tooling**: Same TypeScript, testing, deployment standards

**Verdict**: ✅ **Monorepo is ideal for StudyPuck**

**Why monorepo fits**:
- **Code sharing**: Easy imports between web/desktop/mobile apps
- **Atomic refactoring**: Update card logic in one commit across all platforms
- **Simplified tooling**: One CI/CD, one testing setup, one dependency management
- **No team boundaries**: Single developer, no access control needs

## Cloudflare Pages Deployment Compatibility

### Monorepo Support Verified ✅

**Cloudflare Pages monorepo capabilities**:
- **Multiple projects per repo**: Up to 5 Pages projects per repository
- **Selective builds**: Configure build triggers per app directory
- **Build isolation**: Each app can have its own build command and output directory

**StudyPuck deployment strategy**:
```bash
# Web app deployment
Root directory: /
Build command: pnpm turbo build --filter=web
Output directory: /apps/web/.svelte-kit/cloudflare

# Marketing site (future)
Root directory: /
Build command: pnpm turbo build --filter=marketing
Output directory: /apps/marketing/.svelte-kit/cloudflare
```

**No deployment blockers identified** ✅

## Standard Monorepo Structure

### Well-Established Pattern ✅

**Industry standard structure** (used by companies like Vercel, Shopify, Turborepo examples):
```
/
├── apps/                    # Applications
│   ├── web/                # SvelteKit web app
│   ├── desktop/            # Tauri desktop app (future)
│   └── mobile/             # React Native/Capacitor (future)
├── packages/               # Shared libraries
│   ├── ui/                 # Shared Svelte components
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Shared utilities
│   ├── database/           # Database schemas and migrations
│   └── auth/               # Authentication utilities
├── tools/                  # Development tools and scripts
├── docs/                   # Documentation (current structure)
├── package.json            # Workspace root
├── pnpm-workspace.yaml     # PNPM workspace config
├── turbo.json             # Turborepo config
└── tsconfig.json          # TypeScript root config
```

## Tooling Stack Recommendation

### Package Management: PNPM Workspaces
- **Fast installations**: Shared dependency resolution
- **Disk space efficient**: Symlinked dependencies
- **SvelteKit compatible**: Well-tested integration

### Build Orchestration: Turborepo
- **Intelligent caching**: Skip unchanged builds
- **Parallel execution**: Build apps simultaneously
- **Cloudflare Pages compatible**: Proven deployment pattern

### Standard Tooling Configuration
```json
// package.json (root)
{
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev --parallel",
    "test": "turbo test",
    "lint": "turbo lint"
  }
}

// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".svelte-kit/**", "dist/**"]
    },
    "dev": {
      "cache": false
    }
  }
}
```

## Risk Assessment

### Potential Issues ❌
**None identified for StudyPuck's scope**

### Scale Considerations ✅
- **Current size**: Small hobby project, no scale issues
- **Growth potential**: Mobile/desktop apps are logical monorepo additions
- **Team size**: Single developer, no collaboration complexity
- **Deployment**: Cloudflare Pages fully supports monorepo patterns

### Future Flexibility ✅
- **Easy migration**: Can split repos later if needed (rare)
- **Standard tooling**: Using well-supported tools reduces lock-in
- **Gradual growth**: Add apps/packages as needed without restructuring

## Decision Framework Applied

### StudyPuck Monorepo Advantages
1. **Atomic changes**: Update card components across web/mobile/desktop in one commit
2. **Shared development**: Same auth, database, UI patterns across platforms
3. **Simplified CI/CD**: One pipeline for testing, linting, building
4. **Code reuse**: Easy imports between apps without publishing packages
5. **Consistent standards**: Single TypeScript config, testing setup, dependency versions

### No Significant Disadvantages
- **Build complexity**: Mitigated by Turborepo caching
- **Scale issues**: Not relevant for current project size
- **Team conflicts**: Single developer, no concern
- **Deployment complexity**: Cloudflare Pages handles monorepos well

## Recommended Structure

### Phase 1: Initial Setup (Web App Only)
```
studypuck/
├── apps/
│   └── web/                # SvelteKit app (current)
├── packages/
│   ├── types/              # Shared TypeScript types
│   └── ui/                 # Shared Svelte components (extracted from web)
├── docs/                   # Current documentation
├── package.json            # Workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

### Phase 2: Multi-Platform
```
studypuck/
├── apps/
│   ├── web/                # SvelteKit PWA
│   ├── desktop/            # Tauri app
│   └── mobile/             # Capacitor/React Native
├── packages/
│   ├── ui/                 # Shared components
│   ├── types/              # TypeScript definitions  
│   ├── auth/               # Auth.js + Auth0 logic
│   ├── database/           # Neon Postgres schemas and queries
│   └── utils/              # Language learning utilities
└── ...
```

**Verdict**: ✅ **Monorepo is the correct choice for StudyPuck**

## Migration Plan

### Current State Analysis
**Current repository structure**:
```
StudyPuck/
├── docs/                   # Architecture documentation
│   ├── requirements/
│   └── specs/
├── LICENSE
└── README.md
```

**Migration goal**: Transform into standard monorepo structure while preserving git history and documentation.

### Phase 1: Monorepo Foundation Setup

#### Step 1: Initialize Workspace Structure
```bash
# Create monorepo directories
mkdir -p apps/web packages/{types,ui} tools

# Move current docs to preserve structure
# (docs/ stays at root as established)
```

#### Step 2: Package Management Setup
**Install PNPM globally** (if not already):
```bash
npm install -g pnpm
```

**Create workspace configuration**:
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

**Root package.json**:
```json
{
  "name": "studypuck",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint",
    "type-check": "turbo type-check"
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

#### Step 3: Turborepo Configuration
**Create turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".svelte-kit/**", "dist/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.ts", "src/**/*.svelte", "tests/**"]
    },
    "lint": {
      "inputs": ["src/**/*.ts", "src/**/*.svelte"]
    },
    "type-check": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.ts", "src/**/*.svelte"]
    }
  }
}
```

#### Step 4: TypeScript Root Configuration
**Create tsconfig.json** (root):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@studypuck/types": ["packages/types/src"],
      "@studypuck/ui": ["packages/ui/src"],
      "@studypuck/utils": ["packages/utils/src"]
    }
  },
  "references": [
    { "path": "./apps/web" },
    { "path": "./packages/types" },
    { "path": "./packages/ui" }
  ]
}
```

### Phase 2: SvelteKit App Setup

#### Step 5: Initialize Web App
```bash
cd apps/web
pnpm create svelte@latest . --template app --types typescript --no-add-ons
```

**Configure web app package.json**:
```json
{
  "name": "@studypuck/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "vite build",
    "dev": "vite dev",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint .",
    "type-check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
  },
  "dependencies": {
    "@studypuck/types": "workspace:*",
    "@studypuck/ui": "workspace:*"
  }
}
```

#### Step 6: Cloudflare Adapter Configuration
```bash
cd apps/web
pnpm add -D @sveltejs/adapter-cloudflare
```

**Update svelte.config.js**:
```javascript
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    })
  }
};
```

### Phase 3: Shared Packages Setup

#### Step 7: Types Package
```bash
cd packages/types
pnpm init
```

**packages/types/package.json**:
```json
{
  "name": "@studypuck/types",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc --noEmit",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**packages/types/src/index.ts**:
```typescript
// Auth types (from auth architecture)
export interface User {
  auth0_user_id: string;
  email: string;
  display_name: string;
  native_language?: string;
  created_at: string;
  updated_at: string;
}

// Card types (from database schema)
export interface Card {
  card_id: string;
  user_id: string;
  language_id: string;
  // ... other card properties
}

// Language learning types
export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
```

#### Step 8: UI Components Package
```bash
cd packages/ui
pnpm init
pnpm add -D svelte typescript
```

**packages/ui/package.json**:
```json
{
  "name": "@studypuck/ui",
  "version": "0.1.0",
  "type": "module",
  "svelte": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "svelte": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "svelte-package",
    "type-check": "svelte-check --tsconfig ./tsconfig.json"
  },
  "peerDependencies": {
    "svelte": "^4.0.0"
  }
}
```

### Phase 4: Migration Validation

#### Step 9: Git History Preservation
**Current approach preserves all history** since we're adding structure, not moving existing files.

#### Step 10: Development Workflow Testing
```bash
# Install all dependencies
pnpm install

# Test development workflow
pnpm dev

# Test build process
pnpm build

# Test type checking
pnpm type-check
```

#### Step 11: Cloudflare Pages Configuration Update
**In Cloudflare Pages dashboard**:
- **Build command**: `pnpm turbo build --filter=web`
- **Output directory**: `/apps/web/.svelte-kit/cloudflare`
- **Root directory**: `/` (unchanged)

### Phase 5: Future Growth Structure

#### Ready for Desktop App (Phase 2)
```bash
cd apps/desktop
# Tauri setup when ready
pnpm create tauri-app . --template vanilla-ts
```

#### Ready for Mobile App (Phase 2)
```bash
cd apps/mobile  
# Capacitor setup when ready
pnpm create @capacitor/app . --name StudyPuck
```

## Migration Timeline

### Immediate (Next Development Session)
1. **Workspace setup** (Steps 1-4): 30 minutes
2. **Web app initialization** (Steps 5-6): 45 minutes  
3. **Shared packages** (Steps 7-8): 30 minutes
4. **Testing & validation** (Steps 9-11): 30 minutes

**Total estimated time: ~2.5 hours**

### Benefits Immediate
- **Modern development**: PNPM + Turborepo workflow
- **Type safety**: Shared types across future applications
- **Code organization**: Clear separation of concerns
- **Future-ready**: Structure supports mobile/desktop addition

**Migration preserves all existing work while establishing foundation for multi-platform growth.**

## Implementation Planning

### Migration Timing Decision
**Should monorepo migration happen now or later?**

**Analysis**: Migration can wait until implementation phase because:
- **No architecture dependencies**: Remaining topics (CSS, testing, deployment) don't require monorepo structure
- **Clean implementation start**: Better to migrate once, with full context of all architecture decisions
- **No development blocking**: Current simple structure works fine for architecture documentation

**Decision**: ✅ **Include migration in implementation plan, not immediate execution**

### Implementation Philosophy Integration
**Favor working features over completed layers** - build incrementally with working deployments at each step:

1. **Monorepo setup + minimal SvelteKit app** → Deploy immediately to studypuck.app
2. **Add authentication** → Working login/logout flow  
3. **Add basic card functionality** → Create/view cards
4. **Add database integration** → Persistent storage
5. **Add AI features** → Translation drills

Each step maintains working deployment to studypuck.app

---
*This section will expand as architecture topics complete*