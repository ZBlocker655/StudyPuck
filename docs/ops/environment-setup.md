# Environment Setup Guide

**Purpose**: Complete guide to environment variable configuration across all StudyPuck environments.

## Environment Architecture

### **Three-Tier Environment Strategy**
```
Local Development ←→ GitHub Actions ←→ Production (Cloudflare)
```

Each environment requires different variable sources and access patterns.

## Local Development Environment

### **Local Node Runtime**
```bash
nvm install 22
nvm use 22
node -v
```

Use `nvm` on the local PC whenever StudyPuck raises its Node baseline. Avoid mixing this with a separate global Node installation.

### **Normal Workflow: `.env.schema` + Bitwarden**
```bash
# Committed source of truth
.env.schema

# Local/Codespaces secret source
Bitwarden item: studypuck-development
# Override with STUDYPUCK_BITWARDEN_ITEM if needed.
```

The standard developer workflow no longer depends on a persistent plaintext `apps/web/.env` file.

Instead:

- ✅ `.env.schema` is the committed source of truth for required variables
- ✅ Bitwarden stores the real local/Codespaces secret values
- ✅ Repo scripts inject secrets into the specific command you run
- ✅ GitHub Actions and Cloudflare keep using platform-native environment injection

### **Secure Local Commands**
```bash
# Verify that Bitwarden-backed variables resolve
pnpm env:check:secure

# Standard Vite/SvelteKit dev
pnpm dev:secure

# Workers-style local verification
pnpm dev:workers:secure

# Database migration commands
pnpm db:migrate:secure
pnpm db:studio:secure
```

### **Remote Devcontainers and Codespaces**
- ✅ **Same schema**: Remote development uses the committed `.env.schema`
- ✅ **Same secret source**: Codespaces resolves app secrets from Bitwarden
- ✅ **Same variable names**: Keep `DATABASE_URL`, `AUTH_*`, and Auth0 variables aligned with local development
- ✅ **Same migration rule**: Use a **direct** Neon connection string for migrations

```bash
# Authenticate Bitwarden once per shell
bw unlock --raw

# Export the returned session token in your shell
# PowerShell: $env:BW_SESSION = "<token>"
# Bash: export BW_SESSION="<token>"

# Then use the secure repo commands
pnpm dev:secure
```

For the full remote environment workflow, see [Remote Development](./remote-development.md).

### **How Each Package Accesses Variables**

#### **SvelteKit Web App (apps/web/)**
- ✅ **Runtime access**: Reads from the process environment provided by the secure wrapper or hosting platform
- ✅ **Server-side**: Access via `$env/dynamic/private` or `event.platform.env`
- ✅ **Client-side**: Only `PUBLIC_*` variables accessible

#### **Database Package (packages/database/)**
- ✅ **Build-time access**: Uses `process.env` and expects the caller to inject env vars securely
- ✅ **Fallback to globalThis**: Works in Cloudflare Workers runtime
- ✅ **Production compatible**: No errors in serverless environments

```typescript
// packages/database/src/index.ts
export const db = createDatabaseConnection(
  (typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined) ||
  (globalThis as any).DATABASE_URL || 
  (() => { throw new Error('DATABASE_URL environment variable is required'); })()
);
```

## GitHub Actions Environment

### **Required Secrets**
```bash
# Repository Settings → Secrets and variables → Actions → Repository secrets

# Database Access
NEON_API_KEY           # For ephemeral branch management + development sync
DEV_DATABASE_URL       # Development database connection  
PROD_DATABASE_URL      # Production database connection

# Agent Management
AGENT_NEON_API_KEY     # Limited scope for agent branch creation

# Deployment
CLOUDFLARE_API_TOKEN   # For deployment management
```

### **How Variables Are Used**
```yaml
# .github/workflows/test.yml
env:
  DATABASE_URL: ${{ secrets.DEV_DATABASE_URL }}

# .github/workflows/deploy.yml  
env:
  DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
```

### **Secret Management**
- **Scope**: Repository-wide (not environment-specific)
- **Access**: Available to all workflows
- **Security**: Masked in logs automatically
- **Updates**: Manual via GitHub UI

## Cloudflare Production Environment

### **Environment Variables Configuration**
```bash
# Cloudflare Pages → studypuck.app → Settings → Environment variables

# Database
DATABASE_URL           # Production database connection (direct, not pooled)

# Authentication
AUTH_SECRET           # Production auth secret (generate new for prod)
AUTH0_CLIENT_ID       # Production Auth0 credentials
AUTH0_CLIENT_SECRET   # Production Auth0 credentials  
AUTH0_ISSUER          # Production Auth0 domain
AUTH0_AUDIENCE        # Production API audience
```

### **Variable Sources**
- **Manual entry**: Via Cloudflare Dashboard
- **Build-time**: Available during Pages build process
- **Runtime**: Available in Workers/Pages functions

### **Environment Isolation**
- **Production**: Live environment variables
- **Preview**: Can use separate preview variables
- **Development**: Uses the Bitwarden-backed secure command flow

## Connection String Management

### **Database Connection Types**
Based on research findings, connection string choice is critical:

#### **Development Environment**
```bash
# Use DIRECT connection (required for migrations)
DATABASE_URL="postgresql://user:pass@ep-development.region.aws.neon.tech/db"
```

#### **Production Environment**
```bash
# Option A: Direct connection (simplest)
DATABASE_URL="postgresql://user:pass@ep-production.region.aws.neon.tech/db"

# Option B: Pooled for runtime, direct for migrations (advanced)
DATABASE_URL="postgresql://user:pass@ep-production-pooler.region.aws.neon.tech/db"
MIGRATION_DATABASE_URL="postgresql://user:pass@ep-production.region.aws.neon.tech/db"
```

### **Critical Guidelines**
- ⚠️ **Always use DIRECT for migrations** - pooled connections break migration tracking
- ✅ **Pooled connections OK for application runtime** - better performance
- ✅ **Both work for queries** - only migrations are sensitive

## Environment Variable Patterns

### **Naming Conventions**
```bash
# Database
DATABASE_URL          # Primary database connection
DEV_DATABASE_URL     # Development database (GitHub Actions)
PROD_DATABASE_URL    # Production database (GitHub Actions)

# Authentication
AUTH_SECRET          # Session signing secret
AUTH0_CLIENT_ID      # Auth0 application ID
AUTH0_CLIENT_SECRET  # Auth0 application secret
AUTH0_ISSUER         # Auth0 domain URL
AUTH0_AUDIENCE       # Auth0 API audience

# API Access
NEON_API_KEY         # Full Neon API access
AGENT_NEON_API_KEY   # Limited scope for agents
CLOUDFLARE_API_TOKEN # Deployment management
```

### **Security Levels**
- 🔴 **Highly Sensitive**: AUTH0_CLIENT_SECRET, AUTH_SECRET, API keys
- 🟡 **Moderately Sensitive**: Database URLs, Auth0 configuration
- 🟢 **Public**: AUTH0_ISSUER, AUTH0_AUDIENCE (if needed client-side)

## Environment Validation

### **Local Development Health Check**
```bash
# Confirm secure env resolution
pnpm env:check:secure

# Test database connectivity
pnpm db:migrate:secure

# Test web app environment
pnpm dev:secure
```

### **GitHub Actions Validation**
```yaml
# Add to test workflow
- name: Validate environment
  run: |
    echo "DATABASE_URL is set: $([[ -n "$DATABASE_URL" ]] && echo "yes" || echo "no")"
    echo "NEON_API_KEY is set: $([[ -n "$NEON_API_KEY" ]] && echo "yes" || echo "no")"
```

### **Production Validation**
```bash
# Via Cloudflare Pages Functions
export async function onRequest(context) {
  const dbUrl = context.env.DATABASE_URL;
  return new Response(`DB configured: ${!!dbUrl}`);
}
```

## Troubleshooting

### **Common Issues**

#### **"DATABASE_URL not found" (Local)**
- ✅ Verify `BW_SESSION` is set or `BW_PASSWORD` is available for non-interactive unlock
- ✅ Verify the Bitwarden item contains a `DATABASE_URL` custom field
- ✅ Run `pnpm env:check:secure`
- ✅ Restart development servers

#### **"Cannot connect to database" (Any environment)**
- ✅ Verify connection string format
- ✅ Check if using direct vs pooled connection
- ✅ Verify Neon database is active

#### **"Environment variable not set" (GitHub Actions)**
- ✅ Check secret name spelling
- ✅ Verify secret scope (repository vs environment)
- ✅ Check workflow file variable mapping

#### **"Auth0 configuration invalid" (Production)**
- ✅ Verify Auth0 domain matches issuer
- ✅ Check client ID/secret are for correct Auth0 application
- ✅ Verify audience matches API settings

### **Environment Debugging**
```bash
# Local development
echo $DATABASE_URL

# GitHub Actions (add to workflow)
env: 
  DEBUG: true
run: env | grep -E "(DATABASE|AUTH0|NEON)" | sort

# Cloudflare (via Pages function)
export async function onRequest(context) {
  return new Response(JSON.stringify(Object.keys(context.env)));
}
```

---

**Next**: See [GitHub Actions Setup](./github-actions-setup.md) for CI/CD pipeline configuration.
