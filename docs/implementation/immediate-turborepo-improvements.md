# Immediate Turborepo Improvements - Action Items

**Date**: December 27, 2024  
**Context**: Phase 1 improvements from `turborepo-svelte-best-practices-analysis.md`  
**Timing**: Apply during Milestone 1.2 Authentication implementation

## 🎯 Immediate Actions (Low Risk, High Value)

### 1. **Enhanced turbo.json Configuration** ⚡ DO NOW

**Current Issue**: Missing task dependencies and suboptimal caching

**Action Required:**
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
    "lint": {
      "dependsOn": ["^lint"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Benefits:**
- ✅ Proper build order (packages before apps)
- ✅ Better terminal interface with `"ui": "tui"`
- ✅ Environment file tracking for cache invalidation
- ✅ Separate type checking task

**Risk**: ⬇️ LOW - Non-breaking configuration enhancement

### 2. **Add .npmrc Configuration** ⚡ DO NOW

**Action Required:**
Create `.npmrc` in project root:
```
auto-install-peers = true
```

**Benefits:**
- ✅ Automatic peer dependency installation
- ✅ Reduces manual dependency management
- ✅ Better developer onboarding experience

**Risk**: ⬇️ LOW - Standard PNPM configuration

### 3. **Update Root Package Scripts** ⚡ DO NOW

**Current:**
```json
{
  "build": "turbo build",
  "lint": "turbo lint"
}
```

**Enhanced:**
```json
{
  "build": "turbo build",
  "dev": "turbo dev", 
  "lint": "turbo lint",
  "check-types": "turbo check-types",
  "format": "prettier --write ."
}
```

**Benefits:**
- ✅ Consistent script naming with Turborepo example
- ✅ Preparation for future formatting setup
- ✅ Type checking as separate concern

**Risk**: ⬇️ LOW - Additive script changes

## 🔄 During Authentication Implementation

### 4. **Enhanced Web App Scripts** ⚡ DURING MILESTONE 1.2

**Current web package.json scripts:**
```json
{
  "build": "vite build",
  "lint": "svelte-check --tsconfig ./tsconfig.json"
}
```

**Recommended enhancement:**
```json
{
  "build": "svelte-kit sync && vite build", 
  "check-types": "tsc --noEmit",
  "lint": "svelte-check --tsconfig ./tsconfig.json"
}
```

**Benefits:**
- ✅ Proper SvelteKit build process
- ✅ Separate type checking (prep for ESLint later)
- ✅ Aligns with Turborepo best practices

**Risk**: ⬇️ LOW - Improves existing build process

### 5. **Environment File Handling** ⚡ DURING MILESTONE 1.2

**Context**: Authentication will require environment variables

**Action**: Ensure turbo.json `"inputs"` includes environment files:
```json
"inputs": ["$TURBO_DEFAULT$", ".env*"]
```

**Benefits:**
- ✅ Cache invalidation when env vars change
- ✅ Proper build caching for Auth0 config changes

**Risk**: ⬇️ LOW - Better caching behavior

## 📋 Implementation Checklist

### ✅ Apply Immediately (Before Starting Milestone 1.2)
- [ ] Update `turbo.json` with task dependencies
- [ ] Add `.npmrc` with auto-install-peers
- [ ] Update root `package.json` scripts
- [ ] Test that `pnpm lint` still works
- [ ] Test that `pnpm build` still works

### ✅ During Milestone 1.2 
- [ ] Update web app scripts in `apps/web/package.json`
- [ ] Verify environment file caching works with Auth0 vars
- [ ] Test new `check-types` script

### ⏳ Deferred to Future Milestones
- Shared ESLint config package (Milestone 1.3)
- Prettier setup (Milestone 1.3) 
- Testing infrastructure (Milestone 1.4)
- Shared UI package (Post Milestone 1.4)

## 🚨 What NOT to Do Now

**Avoid These (High Risk/Effort):**
- ❌ Don't create shared packages yet (Milestone 1.3)
- ❌ Don't add testing infrastructure yet (Milestone 1.4)  
- ❌ Don't refactor existing code structures
- ❌ Don't change build outputs in turbo.json beyond what's specified

**Reasoning:**
- Keep changes minimal and low-risk
- Focus on authentication implementation
- Apply best practices incrementally
- Maintain working deployment pipeline

## ✅ Success Criteria

After applying these changes:
- [ ] `pnpm lint` works the same as before
- [ ] `pnpm build` works the same as before  
- [ ] Local development (`pnpm dev`) works as before
- [ ] CI/CD pipeline continues working
- [ ] New `pnpm check-types` command works
- [ ] Turbo UI shows improved task display

## 🔗 References

- **Full Analysis**: `docs/implementation/turborepo-svelte-best-practices-analysis.md`
- **Progress Tracking**: `docs/implementation/progress-checklist.md`
- **Turborepo Example**: https://github.com/vercel/turborepo/tree/main/examples/with-svelte