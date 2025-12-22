# Monorepo Migration Guide

**Part of**: Milestone 1.1 - Monorepo + Basic SvelteKit App  
**Reference**: `/docs/specs/monorepo-structure-design.md`

## Overview

This guide transforms the current StudyPuck repository into a monorepo structure with PNPM workspaces and Turborepo, then creates the SvelteKit web application.

## Current Repository Structure
```
StudyPuck/
├── docs/
├── README.md
├── LICENSE
└── .git/
```

## Target Monorepo Structure
```
StudyPuck/
├── apps/
│   └── web/                 # SvelteKit application
├── packages/               # Shared packages (future)
├── docs/                   # Documentation (existing)
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD pipeline
├── package.json            # Root workspace config
├── pnpm-workspace.yaml     # PNPM workspace definition
├── turbo.json             # Turborepo configuration
├── .gitignore             # Updated for monorepo
├── README.md              # Existing
└── LICENSE                # Existing
```

## Implementation Steps

### Step 1: Install Tooling

1. **Install PNPM globally**
   ```bash
   npm install -g pnpm
   ```

2. **Initialize workspace**
   ```bash
   pnpm init
   ```

### Step 2: Create Workspace Configuration

1. **Create `package.json` (root)**
   ```json
   {
     "name": "studypuck",
     "private": true,
     "description": "A language learning app using AI-powered translation drills and spaced repetition",
     "type": "module",
     "engines": {
       "node": ">=20.0.0",
       "pnpm": ">=8.0.0"
     },
     "packageManager": "pnpm@8.15.0",
     "scripts": {
       "build": "turbo build",
       "dev": "turbo dev",
       "test": "turbo test",
       "lint": "turbo lint",
       "clean": "turbo clean"
     },
     "devDependencies": {
       "turbo": "^1.11.0"
     }
   }
   ```

2. **Create `pnpm-workspace.yaml`**
   ```yaml
   packages:
     - "apps/*"
     - "packages/*"
   ```

3. **Create `turbo.json`**
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "pipeline": {
       "build": {
         "outputs": ["dist/**", "build/**", ".svelte-kit/**"]
       },
       "dev": {
         "cache": false,
         "persistent": true
       },
       "test": {
         "outputs": ["coverage/**"]
       },
       "lint": {},
       "clean": {
         "cache": false
       }
     }
   }
   ```

### Step 3: Create SvelteKit Application

1. **Create apps directory**
   ```bash
   mkdir apps
   cd apps
   ```

2. **Create SvelteKit app**
   ```bash
   pnpm create sveltekit@latest web --template skeleton --types typescript --no-eslint --no-playwright --no-vitest
   cd web
   ```

3. **Install Cloudflare adapter**
   ```bash
   pnpm add -D @sveltejs/adapter-cloudflare
   ```

4. **Configure `svelte.config.js`**
   ```javascript
   import adapter from '@sveltejs/adapter-cloudflare';
   
   /** @type {import('@sveltejs/kit').Config} */
   const config = {
     kit: {
       adapter: adapter({
         routes: {
           include: ['/*'],
           exclude: ['<all>']
         }
       })
     }
   };
   
   export default config;
   ```

### Step 4: Create Basic "Hello StudyPuck" Content

1. **Update `src/routes/+page.svelte`**
   ```svelte
   <svelte:head>
     <title>StudyPuck - AI-Powered Language Learning</title>
     <meta name="description" content="Learn languages with AI-powered translation drills and spaced repetition" />
   </svelte:head>
   
   <main>
     <header>
       <h1>StudyPuck</h1>
       <p>AI-Powered Language Learning</p>
     </header>
     
     <section>
       <h2>Welcome to StudyPuck</h2>
       <p>Your journey to language mastery begins here.</p>
       <p>Coming soon: AI-powered translation drills and intelligent spaced repetition.</p>
     </section>
   
     <footer>
       <p>Milestone 1.1: Monorepo + Basic SvelteKit App ✅</p>
     </footer>
   </main>
   
   <style>
     main {
       max-width: 800px;
       margin: 0 auto;
       padding: 2rem;
       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
     }
     
     header {
       text-align: center;
       margin-bottom: 3rem;
     }
     
     h1 {
       color: #0066cc;
       font-size: 3rem;
       margin: 0;
     }
     
     header p {
       color: #666;
       font-size: 1.2rem;
       margin: 0.5rem 0 0 0;
     }
     
     section {
       background: #f8f9fa;
       padding: 2rem;
       border-radius: 8px;
       margin-bottom: 2rem;
     }
     
     footer {
       text-align: center;
       color: #888;
       font-size: 0.9rem;
       border-top: 1px solid #eee;
       padding-top: 1rem;
     }
   </style>
   ```

2. **Update `src/app.html`**
   ```html
   <!DOCTYPE html>
   <html lang="en" %sveltekit.theme%>
     <head>
       <meta charset="utf-8" />
       <link rel="icon" href="%sveltekit.assets%/favicon.png" />
       <meta name="viewport" content="width=device-width, initial-scale=1" />
       %sveltekit.head%
     </head>
     <body data-sveltekit-preload-data="hover">
       <div style="display: contents">%sveltekit.body%</div>
     </body>
   </html>
   ```

### Step 5: Install Dependencies and Test

1. **Install all dependencies from root**
   ```bash
   cd ../../  # Back to root
   pnpm install
   ```

2. **Test development server**
   ```bash
   pnpm turbo dev --filter=web
   ```
   - Visit `http://localhost:5173`
   - Verify "Hello StudyPuck" page loads

3. **Test build**
   ```bash
   pnpm turbo build --filter=web
   ```
   - Check `apps/web/build/` contains static files
   - Verify no build errors

### Step 6: Update .gitignore

1. **Create/update `.gitignore`**
   ```gitignore
   # Dependencies
   node_modules/
   
   # Build outputs
   build/
   dist/
   .svelte-kit/
   
   # Environment
   .env
   .env.local
   .env.*.local
   
   # Editor
   .vscode/
   .DS_Store
   
   # Logs
   npm-debug.log*
   yarn-debug.log*
   yarn-error.log*
   pnpm-debug.log*
   
   # Runtime
   *.log
   .pnpm-debug.log*
   
   # Temporary
   .tmp/
   .cache/
   ```

## Verification

### Local Verification
- [ ] `pnpm turbo dev --filter=web` starts development server
- [ ] `http://localhost:5173` shows "Hello StudyPuck" page
- [ ] `pnpm turbo build --filter=web` completes without errors
- [ ] `apps/web/build/` contains `index.html` and assets

### File Structure Verification
```bash
tree -I node_modules
```
Should show the target monorepo structure.

### Package Management Verification
```bash
pnpm list --depth=0
```
Should show turbo in root dependencies, SvelteKit in web app dependencies.

## Common Issues

### PNPM Installation
- **Command not found**: Ensure PNPM installed globally
- **Version issues**: Use PNPM 8.15.0 or later

### SvelteKit Setup  
- **Adapter errors**: Verify `@sveltejs/adapter-cloudflare` installed
- **Build failures**: Check `svelte.config.js` configuration
- **Port conflicts**: Use different port if 5173 is busy

### Workspace Issues
- **Dependencies not found**: Run `pnpm install` from root
- **Scripts not working**: Verify `package.json` scripts reference turbo correctly

## Next Steps

After completing this guide:
1. Commit changes to `feature/impl1.1` branch
2. Test GitHub Actions deployment pipeline
3. Verify deployment to `studypuck.app`

See [Milestone 1.1](../milestones/1.1-monorepo-setup.md) for deployment instructions.