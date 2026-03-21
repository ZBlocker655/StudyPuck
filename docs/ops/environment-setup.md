# Environment Setup Guide

**Purpose**: Complete guide to environment variable configuration across all StudyPuck environments.

## Environment Architecture

### **Three-Tier Environment Strategy**
```
Local Development ←→ GitHub Actions ←→ Production (Cloudflare)
```

Each environment requires different variable sources and access patterns.

## Local Development Environment

### **Project .env File**
```bash
# Location: /StudyPuck/apps/web/.env (web app root)
# Purpose: SvelteKit and Wrangler automatically load from here

# Database Configuration
DATABASE_URL="postgresql://user:pass@ep-development.region.aws.neon.tech/db"

# Auth0 Configuration  
AUTH_SECRET="example_32_char_auth_secret_hex"
AUTH_TRUST_HOST="true"
AUTH0_CLIENT_ID="example_client_id_32_characters"
AUTH0_CLIENT_SECRET="example-client-secret-64-chars-XXXXXXXXXXXXXXXXXXXXXXX"
AUTH0_ISSUER="https://dev-example-tenant.us.auth0.com"
AUTH0_AUDIENCE="https://api.studypuck.app"
```

### **Remote Devcontainers and Codespaces**
- ✅ **Same app env file**: Remote development should still use `apps/web/.env`
- ✅ **Template source**: Copy from the committed root `.env.example`
- ✅ **Same variable names**: Keep `DATABASE_URL`, `AUTH_*`, and Auth0 variables aligned with local development
- ✅ **Same migration rule**: Use a **direct** Neon connection string for migrations

```bash
cp .env.example apps/web/.env
```

For the full remote environment workflow, see [Remote Development](./remote-development.md).

### **How Each Package Accesses Variables**

#### **SvelteKit Web App (apps/web/)**
- ✅ **Automatic discovery**: Loads `.env` from `apps/web/.env`
- ✅ **No configuration needed**: Standard SvelteKit behavior
- ✅ **Server-side**: Access via `$env/dynamic/private` or `event.platform.env`
- ✅ **Client-side**: Only `PUBLIC_*` variables accessible

#### **Database Package (packages/database/)**
- ✅ **Build-time access**: Uses `process.env` with typeof check for Workers compatibility
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
- **Development**: Uses local `.env` file

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
# Test database connectivity
cd packages/database
pnpm run migrate # Should work without manual environment setting

# Test web app environment
cd apps/web  
pnpm dev # Should start without environment errors
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
- ✅ Verify `.env` file exists at `apps/web/.env`
- ✅ Recreate it from the template if needed: `cp .env.example apps/web/.env`
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
