# Architecture Requirements

## Project Nature & Goals
- **Hobby project** for learning new languages and software technologies
- **Multi-platform target**: Web browser (primary), Windows/cross-platform desktop, mobile apps
- **Unified experience**: Same UI/UX across all platforms (similar to WorkFlowy)
- **Development approach**: Web-first, then expand to desktop and mobile
- **Scale**: Tens of thousands of cards, handful of users initially
- **Commercial potential**: Possible future consideration

## Hosting & Infrastructure
- **Primary hosting**: Cloudflare (studypuck.app domain already registered)
- **Backend**: Cloudflare Workers (serverless functions)
- **Cost optimization**: Minimize operating costs (free tier preferred)
- **Service preference**: Explore Neon Postgres, Cloudflare KV, R2 for data needs

## Frontend Technology Stack
- **Core languages**: TypeScript
- **CSS approach**: Modern pure CSS (no preprocessors, no CSS-in-JS)
- **Responsive design**: Showcase excellent modern CSS techniques
- **Framework**: Svelte
- **Meta-framework**: SvelteKit (TBD based on requirements analysis)
- **Design**: Fully mobile-friendly, responsive

## Cross-Platform Strategy
- **Phase 1**: Web browser application
- **Phase 2**: Desktop application (evaluate latest cross-platform frameworks)
- **Phase 3**: Mobile applications
- **Architecture decision**: PWA vs native apps with shared design language (needs analysis)

## Data & Connectivity
- **Primary mode**: Online application (LLM integration required)
- **Real-time collaboration**: Multi-user with separate data (no sharing)
- **Offline functionality**: Explore options for partial offline capability
- **AI integration**: Translation drill engine + future AI features
- **External services**: Commercial LLM APIs

## Database Architecture
- **Approach**: Detailed analysis needed for optimal DB selection
- **Flexibility**: Open to multiple DBs/data services if beneficial
- **Query patterns**: TBD based on functional requirements analysis
- **Cloudflare services**: Evaluate Neon Postgres, KV storage, R2 compatibility

## Authentication
- **Approach**: Third-party auth service (no custom identity management)
- **Cost constraint**: Must align with budget optimization
- **Options**: TBD based on cost/feature analysis

## Learning Priorities
1. **Frontend**: TypeScript, modern CSS techniques, Svelte/SvelteKit
2. **Backend**: Database architecture design and selection
3. **AI Integration**: First AI-powered application development
4. **Cross-platform**: Latest frameworks for desktop apps
5. **DevOps**: Automated deployment pipelines (GitHub Actions + Cloudflare)
6. **Development Environment**: Virtual sandbox environments (GitHub Codespaces)
7. **Testing Strategy**: Robust testing from start (unit + integration tests)
8. **Database Operations**: Schema migrations and test database strategies

## Open Questions for Analysis
1. PWA vs native cross-platform approach comparison
2. Latest desktop frameworks evaluation (Tauri, etc.)
3. Cloudflare service stack feasibility for requirements
4. Database selection based on query pattern analysis
5. Cost-effective authentication provider options
6. AI service integration patterns
7. Modern testing strategies for database integration tests
8. Database schema migration patterns and tooling