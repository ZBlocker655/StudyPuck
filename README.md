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
- **Database Workflow**: [Developer Workflow Guide](docs/database-workflow.md)
- **Environment Configuration**: [Environment Setup](docs/ops/environment-setup.md)
- **Development Workflows**: [Human](docs/ops/developer-workflows.md) | [AI Agent](docs/ops/ai-agent-workflows.md)
- **Tech Stack Decisions**: [Database](docs/decisions/2026/004-database-neon-postgres.md) | [Auth](docs/decisions/2025/003-auth-auth0-integration.md) | [Frontend](docs/decisions/2025/002-sveltekit-cloudflare-stack.md)

## Database Setup

### Quick Start
```bash
# Setup environment variables (see docs/ops/environment-setup.md)
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations
cd apps/web
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio
```

For complete database setup and workflow documentation, see [docs/database-workflow.md](docs/database-workflow.md).
