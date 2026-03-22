# StudyPuck

A language learning application combining AI-powered translation drills with spaced repetition. Built with SvelteKit, Cloudflare Workers, and Neon Postgres.

## Technology Stack

- **Frontend**: SvelteKit + TypeScript + CUBE CSS
- **Backend**: Cloudflare Workers + Neon Postgres + pgvector
- **AI**: Google Gemini Flash for translation drills and semantic features
- **Auth**: Auth0 + Auth.js
- **Deployment**: Cloudflare Pages

## Documentation

- **[📋 Complete Documentation Hub](docs/README.md)** - Central documentation navigation
- **[⚙️ Operational Procedures](docs/ops/README.md)** - Development, deployment, and maintenance workflows
- **[🏗️ Architectural Decisions](docs/decisions/README.md)** - Major technical decisions and their reasoning
- **[📋 Requirements](docs/requirements/README.md)** - Application requirements and user stories
- **[🔧 Technical Specifications](docs/specs/README.md)** - Architecture analysis and implementation plans

### Quick Links
- **Database Setup**: [Database Branching Guide](docs/ops/database-branching-guide.md)
- **Database Workflow**: [Developer Workflow Guide](docs/ops/database-workflow.md)
- **Environment Configuration**: [Environment Setup](docs/ops/environment-setup.md)
- **Remote Development**: [Remote Development Guide](docs/ops/remote-development.md)
- **Development Workflows**: [Interactive](docs/ops/interactive-development.md) | [Manual](docs/ops/manual-development.md) | [Autonomous AI](docs/ops/autonomous-ai-development.md)
- **Tech Stack Decisions**: [Database](docs/decisions/2026/004-database-neon-postgres.md) | [Auth](docs/decisions/2025/003-auth-auth0-integration.md) | [Frontend](docs/decisions/2025/002-sveltekit-cloudflare-stack.md)

## Database Setup

### Quick Start
```bash
# Use the repo Node baseline on local PCs
nvm install 22
nvm use 22

# Verify your secure varlock + Bitwarden environment
pnpm env:check:secure

# Scan for leaked secrets when varlock is installed
pnpm env:scan:secure

# Start the standard dev server without a plaintext apps/web/.env file
pnpm dev:secure

# Start the Workers-style dev server
pnpm dev:workers:secure

# Run database migrations
pnpm db:migrate:secure

# Open Drizzle Studio
pnpm db:studio:secure
```

The secure repo commands now run through the installed `varlock` CLI, using `.env.schema` as the source of truth. For local and Codespaces development, varlock resolves secrets through the existing Bitwarden helper wired via `exec()` in `.env.schema`, which preserves the approved "unlock once per shell, then run repo commands" workflow.

For complete database setup and workflow documentation, see [docs/ops/database-workflow.md](docs/ops/database-workflow.md).
